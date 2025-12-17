const Transaction = require('../../models/transactionModel');
const Staff = require('../../models/staffModel');
const mongoose = require('mongoose');


const toObjectId = (id) => new mongoose.Types.ObjectId(id.toString());

const buildDateFilter = (startDate, endDate, period) => {
  const filter = {};
  const now = new Date();

  if (period === 'today') {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    filter.createdAt = { $gte: today };
  } else if (period === 'week') {
    const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7);
    filter.createdAt = { $gte: weekAgo };
  } else if (period === 'month') {
    const monthAgo = new Date(); monthAgo.setMonth(now.getMonth() - 1);
    filter.createdAt = { $gte: monthAgo };
  } else if (period === 'year') {
    const yearAgo = new Date(); yearAgo.setFullYear(now.getFullYear() - 1);
    filter.createdAt = { $gte: yearAgo };
  }

  if (startDate) {
    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    filter.createdAt = { ...filter.createdAt, $gte: start };
  }
  if (endDate) {
    const end = new Date(endDate); end.setHours(23, 59, 59, 999);
    filter.createdAt = filter.createdAt ? { ...filter.createdAt, $lte: end } : { $lte: end };
  }

  return filter;
};
// Helper: Get vendor ID from request
const getVendorId = (req) => {
  return req.vendor?._id;
};

// Helper: Get staff IDs for a vendor
const getVendorStaffIds = async (vendorId) => {
  const staffMembers = await Staff.find({ vendor: vendorId }).select('_id').lean();
  return staffMembers.map(s => s._id);
};


// ==================== 1. POINTS REDEMPTION REPORT ====================

exports.getPointsRedemptionReport = async (req, res) => {
  try {
    const vendorId = getVendorId(req);
    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Vendor ID not found"
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { startDate, endDate } = req.query;
    const dateFilter = buildDateFilter(startDate, endDate);

    const staffIds = await getVendorStaffIds(vendorId);

    const filter = {
      staff: { $in: staffIds },
      spentPoints: { $gt: 0 },
      ...dateFilter
    };

    const redemptions = await Transaction.find(filter)
      .populate('user', 'name mobileNumber')  
      .populate('staff', 'name')
      .populate({
        path: 'items.menuItem',
        select: 'name'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Transaction.countDocuments(filter);

    const stats = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalPointsRedeemed: { $sum: '$spentPoints' },
          totalDiscountGiven: { $sum: '$discountAmount' },
          totalRedemptions: { $sum: 1 },
          totalTransactions: { $sum: 1 },
          totalAdminCommission: {
            $sum: {
              $multiply: [
                '$discountAmount',
                { $divide: [{$ifNull: ['$vendor.adminCommission', 0]}, 100] }
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalPointsRedeemed: 1,
          totalDiscountGiven: { $round: ['$totalDiscountGiven', 3] },
          totalRedemptions: 1,
          totalTransactions: 1,
          totalAdminCommission: { $round: ['$totalAdminCommission', 3] }
        }
      }
    ]);

    const statsResult = stats[0] || {
      totalPointsRedeemed: 0,
      totalDiscountGiven: 0,
      totalRedemptions: 0,
      totalTransactions: 0,
      totalAdminCommission: 0
    };

    const formattedRedemptions = redemptions.map((r, i) => {
      const firstItem = r.items?.[0];
      const productName = firstItem?.menuItem?.name || firstItem?.itemName || 'General Discount';

      return {
        sr: skip + i + 1,
        date: r.createdAt,
        userName: r.user?.name || 'Unknown User',
        userMobile: r.user?.mobileNumber || '-',
        productName: productName,
        pointsRedeemed: r.spentPoints || 0,
        discountGiven: (r.discountAmount || 0).toFixed(3),
        transactionId: r._id
      };
    });

    return res.json({
      success: true,
      redemptions: formattedRedemptions,
      stats: statsResult,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        limit,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (err) {
    console.error('Points Redemption Report Error:', err);
    res.status(500).json({
      success: false,
      redemptions: [],
      stats: {
        totalPointsRedeemed: 0,
        totalDiscountGiven: 0,
        totalRedemptions: 0,
        totalTransactions: 0,
        totalAdminCommission: 0
      },
      message: err.message
    });
  }
};

// ==================== 2. CUSTOMER ACTIVITY REPORT ====================

exports.getCustomerActivityReport = async (req, res) => {
  try {
    const vendorId = getVendorId(req);
    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Vendor ID not found"
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { startDate, endDate } = req.query;
    const dateFilter = buildDateFilter(startDate, endDate);

    const staffIds = await getVendorStaffIds(vendorId);

    const matchFilter = {
      staff: { $in: staffIds },
      ...dateFilter
    };

    const customerActivity = await Transaction.aggregate([
      { $match: matchFilter },

      {
        $group: {
          _id: '$user',
          totalSpent: { $sum: '$finalAmount' },
          totalPointsEarned: { $sum: '$earnedPoints' },
          totalPointsRedeemed: { $sum: '$spentPoints' },
          lastVisit: { $max: '$createdAt' },
          firstVisit: { $min: '$createdAt' }
        }
      },

      // Join users for name, photo, mobile
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },

      // MOST IMPORTANT: Join userPoint for this vendor to get actual remaining points
      {
        $lookup: {
          from: 'userpoints',  // ← Ye collection name confirm kar lena (usually lowercase plural)
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$user', '$$userId'] },
                    { $eq: ['$vendor', new mongoose.Types.ObjectId(vendorId)] }
                  ]
                }
              }
            }
          ],
          as: 'userPoint'
        }
      },
      { $unwind: { path: '$userPoint', preserveNullAndEmptyArrays: true } },

      {
        $project: {
          customerId: '$_id',
          customerName: '$customer.name',
          customermMbileNumber: '$customer.mobileNumber',
          customerPhoto: '$customer.photo',
          totalSpent: { $round: ['$totalSpent', 3] },
          totalPointsEarned: 1,
          totalPointsRedeemed: 1,
          lastVisit: 1,
          firstVisit: 1,
          remainingPointsFromUserPoint: '$userPoint.totalPoints'  // Ye asli wala hai
        }
      },

      { $sort: { totalSpent: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    const totalResult = await Transaction.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$user' } },
      { $count: 'totalCustomers' }
    ]);

    const totalCustomers = totalResult[0]?.totalCustomers || 0;

    return res.json({
      success: true,
      customerActivity: customerActivity.map((c, i) => ({
        sr: skip + i + 1,
        customerId: c.customerId,
        customerName: c.customerName || 'Unknown Customer',
        customermMbileNumber: c.customermMbileNumber || "0123456789",
        customerPhoto: c.customerPhoto || null,
        totalVisits: c.totalVisits,
        totalSpent: c.totalSpent || 0,
        totalPointsEarned: c.totalPointsEarned || 0,
        totalPointsRedeemed: c.totalPointsRedeemed || 0,
        // Ab ye 100% sahi dikhega – userPoint se direct
        remainingPoints: c.remainingPointsFromUserPoint >= 0 ? c.remainingPointsFromUserPoint : 0,
        lastVisit: c.lastVisit,
        firstVisit: c.firstVisit
      })),
      stats: {
        totalUniqueCustomers: totalCustomers,
        totalVisitsAll: customerActivity.reduce((sum, c) => sum + (c.totalVisits || 0), 0),
        totalRevenue: customerActivity.reduce((sum, c) => sum + (c.totalSpent || 0), 0).toFixed(3),
        totalPointsDistributed: customerActivity.reduce((sum, c) => sum + (c.totalPointsEarned || 0), 0),
        totalPointsRedeemed: customerActivity.reduce((sum, c) => sum + (c.totalPointsRedeemed || 0), 0),
        totalRemainingPoints: customerActivity.reduce((sum, c) => 
          sum + (c.remainingPointsFromUserPoint >= 0 ? c.remainingPointsFromUserPoint : 0), 0
        )
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCustomers / limit),
        totalRecords: totalCustomers,
        limit: limit,
        hasNext: page < Math.ceil(totalCustomers / limit),
        hasPrev: page > 1
      }
    });

  } catch (err) {
    console.error('Customer Activity Report Error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: err.message
      });
    }
  }
};

// ==================== 3. SALES & COMMISSION REPORT ====================

exports.getSalesAndCommissionReport = async (req, res) => {
  try {
    const vendorId = getVendorId(req);
    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Vendor ID not found"
      });
    }

    const { startDate, endDate } = req.query;
    const dateFilter = buildDateFilter(startDate, endDate);

    const staffIds = await getVendorStaffIds(vendorId);

    const filter = {
      staff: { $in: staffIds },
      ...dateFilter
    };

    // MAIN STATS
    const stats = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$finalAmount' },
          totalCommission: { $sum: '$adminCommission' },
          netEarnings: { 
            $sum: { $subtract: ['$finalAmount', '$adminCommission'] } 
          },
          transactionCount: { $sum: 1 }
        }
      }
    ]);

    const statsResult = stats[0] || {
      totalRevenue: 0,
      totalCommission: 0,
      netEarnings: 0,
      transactionCount: 0
    };

    const commissionTrend = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: { 
              format: "%Y-%m-%d", 
              date: "$createdAt" 
            }
          },
          revenue: { $sum: '$finalAmount' },
          commission: { $sum: '$adminCommission' },
          netEarnings: { 
            $sum: { $subtract: ['$finalAmount', '$adminCommission'] } 
          }
        }
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          revenue: { $round: ["$revenue", 3] },
          commission: { $round: ["$commission", 3] },
          netEarnings: { $round: ["$netEarnings", 3] }
        }
      },
      { $sort: { date: 1 } }
    ]);

    // Calculate commission percentage
    const commissionPercentage = statsResult.totalRevenue > 0
      ? ((statsResult.totalCommission / statsResult.totalRevenue) * 100).toFixed(2)
      : 0;

    return res.json({
      success: true,
      stats: {
        totalRevenue: Number(statsResult.totalRevenue.toFixed(3)),
        totalCommission: Number(statsResult.totalCommission.toFixed(3)),
        netEarnings: Number(statsResult.netEarnings.toFixed(3)),
        transactionCount: statsResult.transactionCount
      },
      commissionPercentage: Number(commissionPercentage),
      commissionTrend
    });

  } catch (err) {
    console.error('Sales & Commission Report Error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: err.message
      });
    }
  }
};


//////// get popular menu items

exports.getPopularMenuItems = async (req, res) => {
  try {
    const vendorId = getVendorId(req);
    if (!vendorId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { startDate, endDate } = req.query;
    const dateFilter = buildDateFilter(startDate, endDate);
    const staffIds = await getVendorStaffIds(vendorId);

    const popularItems = await Transaction.aggregate([
      { $match: { staff: { $in: staffIds }, ...dateFilter } },

      { $unwind: '$items' },

      {
        $lookup: {
          from: 'menuitems',
          localField: 'items.menuItem',
          foreignField: '_id',
          as: 'menuItem'
        }
      },
      { $unwind: { path: '$menuItem', preserveNullAndEmptyArrays: true } },

      { $match: { 'menuItem.name': { $exists: true, $ne: null } } },

      {
        $addFields: {
          "menuItem.price": {
            $cond: [
              { $and: [{ $ne: ["$menuItem.price", null] }, { $ne: ["$menuItem.price", ""] }] },
              { $toDouble: "$menuItem.price" },
              0
            ]
          }
        }
      },

      // Group by menu item
      {
        $group: {
          _id: "$items.menuItem",
          itemName: { $first: "$menuItem.name" },
          category: { $first: "$menuItem.category" },
          price: { $first: "$menuItem.price" },
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: {
            $sum: {
              $multiply: ["$items.quantity", "$menuItem.price"]
            }
          }
        }
      },

      { $match: { itemName: { $ne: null, $exists: true } } },

      { $sort: { totalQuantity: -1 } },
      { $limit: 20 },

      {
        $project: {
          _id: 0,
          itemName: 1,
          category: { $ifNull: ["$category", "Uncategorized"] },
          price: { $round: ["$price", 3] },
          totalQuantity: 1,
          totalRevenue: { $round: ["$totalRevenue", 3] }
        }
      }
    ]);

    return res.json({
      success: true,
      message: popularItems.length > 0 
        ? "Top selling items loaded successfully!" 
        : "No menu items found in this period.",
      totalItems: popularItems.length,
      popularItems
    });

  } catch (err) {
    console.error('Popular Items Error:', err.message);
    return res.status(500).json({
      success: false,
      message: "Error fetching popular items"
    });
  }
};

// 5. CUSTOMER SEGMENTATION REPORT 
exports.getCustomerSegments = async (req, res) => {
  try {
    const vendorId = getVendorId(req);
    if (!vendorId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { startDate, endDate, segment } = req.query;
    const dateFilter = buildDateFilter(startDate, endDate);
    const staffIds = await getVendorStaffIds(vendorId);

    let matchStage = { staff: { $in: staffIds }, ...dateFilter };

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$user',
          _id: '$user',
          visits: { $sum: 1 },
          totalSpent: { $sum: '$finalAmount' },
          pointsEarned: { $sum: '$earnedPoints' },
          pointsRedeemed: { $sum: '$spentPoints' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },

      {
        $addFields: {
          avgBill: { $round: [{ $divide: ['$totalSpent', '$visits'] }, 3] },
          calculatedSegment: {
            $switch: {
              branches: [
                { case: { $gte: ['$totalSpent', 500] }, then: "VIP Customer" },
                { case: { $gte: ['$visits', 15] }, then: "Loyal Regular" },
                { case: { $gte: ['$pointsRedeemed', 400] }, then: "Heavy Redeemer" },
                { case: { $lt: ['$totalSpent', 100] }, then: "New Customer" }
              ],
              default: "Regular Customer"
            }
          }
        }
      },

      {
        $match: segment ? { calculatedSegment: segment } : { $expr: true }
      },

      {
        $project: {
          name: { $ifNull: ['$user.name', 'Guest User'] },
          mobile: '$user.mobile',
          photo: '$user.photo',
          visits: 1,
          totalSpent: { $round: ['$totalSpent', 3] },
          avgBill: 1,
          pointsRedeemed: 1,
          segment: '$calculatedSegment'
        }
      },
      { $sort: { totalSpent: -1 } }
    ];

    const segments = await Transaction.aggregate(pipeline);

    res.json({
      success: true,
      message: segment
        ? `Showing only "${segment}" customers`
        : "Showing all customer segments",
      appliedFilter: segment || "All Segments",
      totalCustomers: segments.length,
      segments
    });

  } catch (err) {
    console.error('Customer Segments Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};