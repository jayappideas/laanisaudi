const Transaction = require('../../models/transactionModel');
const User = require('../../models/userModel');
const Vendor = require('../../models/vendorModel');
const Staff = require('../../models/staffModel');
const mongoose = require('mongoose');
const transaction = require('../../models/transactionModel');

const toObjectId = id => new mongoose.Types.ObjectId(id.toString());

// Helper: Date filter
const buildDateFilter = (startDate, endDate) => {
    const filter = {};
    if (startDate) filter.createdAt = { $gte: new Date(startDate) };
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt = filter.createdAt
            ? { ...filter.createdAt, $lte: end }
            : { $lte: end };
    }
    return filter;
};

exports.getUserAnalytics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const dateFilter = buildDateFilter(startDate, endDate);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const users = await User.find().lean();

        const activeUsers = await Transaction.distinct('user', {
            createdAt: { $gte: thirtyDaysAgo },
        });

        const activeUserIds = activeUsers.map(id => id.toString());

        const userStats = users
            .map(user => ({
                _id: user._id,
                name: user.name || 'Guest',
                mobile: user.mobile,
                email: user.email,
                registeredAt: user.createdAt,
                status: activeUserIds.includes(user._id.toString())
                    ? 'Active'
                    : 'Inactive',
                lastActive: user.lastLogin || null,
            }))

            .sort((a, b) => b.registeredAt - a.registeredAt);

        res.json({
            success: true,
            totalUsers: users.length,
            activeUsers: activeUserIds.length,
            inactiveUsers: users.length - activeUserIds.length,
            newUsersThisMonth: users.filter(
                u =>
                    new Date(u.createdAt) >
                    new Date().setMonth(new Date().getMonth() - 1)
            ).length,
            users: userStats,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getPointRedemptionAnalytics = async (req, res) => {
    try {
        const { startDate, endDate, vendorId, minPoints } = req.query;
        const dateFilter = buildDateFilter(startDate, endDate);

        let filter = {
            spentPoints: { $gt: 0 },
            ...dateFilter,
        };

        // Vendor filter
        if (vendorId) {
            filter['staff.vendor'] = toObjectId(vendorId);
        }
        if (minPoints) {
            filter.spentPoints = { $gte: parseInt(minPoints) };
        }

        const redemptions = await Transaction.aggregate([
            { $match: filter },
            {
                $lookup: {
                    from: 'staffs',
                    localField: 'staff',
                    foreignField: '_id',
                    as: 'staffInfo',
                },
            },
            {
                $unwind: {
                    path: '$staffInfo',
                    preserveNullAndEmptyArrays: true,
                },
            },

            {
                $lookup: {
                    from: 'vendors',
                    localField: 'staffInfo.vendor',
                    foreignField: '_id',
                    as: 'vendorInfo',
                },
            },
            {
                $unwind: {
                    path: '$vendorInfo',
                    preserveNullAndEmptyArrays: true,
                },
            },

            // User lookup
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'customerInfo',
                },
            },
            {
                $unwind: {
                    path: '$customerInfo',
                    preserveNullAndEmptyArrays: true,
                },
            },

            // Items unwind + menu item lookup
            { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'menuitems',
                    localField: 'items.menuItem',
                    foreignField: '_id',
                    as: 'productInfo',
                },
            },
            {
                $unwind: {
                    path: '$productInfo',
                    preserveNullAndEmptyArrays: true,
                },
            },

            // Final grouping
            {
                $group: {
                    _id: '$_id',
                    date: { $first: '$createdAt' },
                    customerName: { $first: '$customerInfo.name' },
                    mobile: { $first: '$customerInfo.mobile' },
                    vendorName: {
                        $first: {
                            $ifNull: [
                                '$vendorInfo.businessName',
                                'Unknown Vendor',
                            ],
                        },
                    },
                    productName: {
                        $first: {
                            $ifNull: ['$productInfo.name', 'Unknown Item'],
                        },
                    },
                    pointsRedeemed: { $first: '$spentPoints' },
                    discountGiven: { $first: '$discountAmount' },
                },
            },

            { $sort: { date: -1 } },
        ]);

        const summary = await Transaction.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    totalRedemptions: { $sum: 1 },
                    totalPointsRedeemed: { $sum: '$spentPoints' },
                    totalDiscountValue: { $sum: '$discountAmount' },
                },
            },
        ]);

        res.json({
            success: true,
            summary: summary[0] || {
                totalRedemptions: 0,
                totalPointsRedeemed: 0,
                totalDiscountValue: 0,
            },
            redemptions,
            filtersApplied: { startDate, endDate, vendorId, minPoints },
        });
    } catch (err) {
        console.error('Redemption Analytics Error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

// exports.getVendorPerformance = async (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;
//     const dateFilter = buildDateFilter(startDate, endDate);

//     const vendorStats = await Transaction.aggregate([
//       { $match: dateFilter },
//       {
//         $lookup: {
//           from: 'vendors',
//           localField: 'staff.vendor',
//           foreignField: '_id',
//           as: 'vendor'
//         }
//       },
//       { $unwind: '$vendor' },
//       {
//         $group: {
//           _id: '$vendor._id',
//           vendorName: { $first: '$vendor.businessName' },
//           totalTransactions: { $sum: 1 },
//           totalRevenue: { $sum: '$finalAmount' },
//           totalRedemptions: {
//             $sum: { $cond: [{ $gt: ['$spentPoints', 0] }, 1, 0] }
//           },
//           totalPointsRedeemed: { $sum: '$spentPoints' },
//           avgBillValue: { $sum: '$discountAmount' }
//         }
//       },
//       { $sort: { totalRevenue: -1 } }
//     ]);

//     res.json({
//       success: true,
//       totalVendors: vendorStats.length,
//       topPerformingVendors: vendorStats.slice(0, 10),
//       allVendors: vendorStats
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

exports.getVendorPerformance = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const dateFilter = buildDateFilter(startDate, endDate);

        const vendorStats = await Transaction.aggregate([
            { $match: dateFilter },

            {
                $lookup: {
                    from: 'staffs',
                    localField: 'staff',
                    foreignField: '_id',
                    as: 'staffInfo',
                },
            },
            {
                $unwind: {
                    path: '$staffInfo',
                    preserveNullAndEmptyArrays: true,
                },
            },

            {
                $lookup: {
                    from: 'vendors',
                    localField: 'staffInfo.vendor',
                    foreignField: '_id',
                    as: 'vendorInfo',
                },
            },
            {
                $unwind: {
                    path: '$vendorInfo',
                    preserveNullAndEmptyArrays: true,
                },
            },

            { $match: { 'vendorInfo._id': { $exists: true } } },

            {
                $group: {
                    _id: '$vendorInfo._id',
                    vendorName: { $first: '$vendorInfo.businessName' },
                    vendorLogo: { $first: '$vendorInfo.logo' },
                    totalTransactions: { $sum: 1 },
                    totalRevenue: { $sum: '$finalAmount' },
                    totalRedemptions: {
                        $sum: { $cond: [{ $gt: ['$spentPoints', 0] }, 1, 0] },
                    },
                    totalPointsRedeemed: { $sum: '$spentPoints' },
                    totalDiscountGiven: { $sum: '$discountAmount' },
                },
            },

            { $sort: { totalRevenue: -1 } },

            {
                $project: {
                    _id: 0,
                    vendorId: '$_id',
                    vendorName: { $ifNull: ['$vendorName', 'Unknown Vendor'] },
                    vendorLogo: 1,
                    totalTransactions: 1,
                    totalRevenue: { $round: ['$totalRevenue', 3] },
                    totalRedemptions: 1,
                    totalPointsRedeemed: 1,
                    totalDiscountGiven: { $round: ['$totalDiscountGiven', 3] },
                },
            },
        ]);

        res.json({
            success: true,
            totalVendors: vendorStats.length,
            topPerformingVendors: vendorStats.slice(0, 10),
            allVendors: vendorStats,
        });
    } catch (err) {
        console.error('Vendor Performance Error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server Error: ' + err.message,
        });
    }
};

exports.getRedemptionTrends = async (req, res) => {
    try {
        const { period = 'daily' } = req.query; // daily, weekly, monthly

        const groupBy =
            period === 'monthly'
                ? {
                      year: { $year: '$createdAt' },
                      month: { $month: '$createdAt' },
                  }
                : {
                      date: {
                          $dateToString: {
                              format: '%Y-%m-%d',
                              date: '$createdAt',
                          },
                      },
                  };

        const trends = await Transaction.aggregate([
            { $match: { spentPoints: { $gt: 0 } } },
            {
                $group: {
                    _id: groupBy,
                    redemptions: { $sum: 1 },
                    pointsRedeemed: { $sum: '$spentPoints' },
                    discountValue: { $sum: '$discountAmount' },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        res.json({
            success: true,
            period,
            trends,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// exports.renderReports = async (req, res) => {
//   try {
//     const { startDate, endDate, vendorId } = req.query;

//     // let start, end;
//     // if (startDate && endDate && startDate !== '' && endDate !== '') {
//     //   start = new Date(startDate);
//     //   end = new Date(endDate);
//     //   end.setHours(23, 59, 59, 999);
//     // } else {
//     //   start = new Date('2020-01-01');
//     //   end = new Date();
//     //   end.setHours(23, 59, 59, 999);
//     // }
//     // Date filter
//     let start = new Date('2020-01-01');
//     let end = new Date(); end.setHours(23, 59, 59, 999);

//     if (startDate && endDate) {
//       start = new Date(startDate);
//       end = new Date(endDate);
//       end.setHours(23, 59, 59, 999);
//     }

//     // Base date filter
//     const dateFilter = { createdAt: { $gte: start, $lte: end } };

//     // Vendor filter for staff
//     let staffIds = [];
//     if (vendorId && vendorId !== '' && vendorId !== 'null') {
//       const vendorObjectId = new mongoose.Types.ObjectId(vendorId);
//       staffIds = await Staff.find({ vendor: vendorObjectId }).distinct('_id');
//     }

//     // 1. Summary (Only Redemptions)
//     const summary = await Transaction.aggregate([
//       {
//         $match: {
//           ...dateFilter,
//           spentPoints: { $gt: 0 },
//           ...(staffIds.length > 0 ? { staff: { $in: staffIds } } : {})
//         }
//       },
//       {
//         $group: {
//           _id: null,
//           totalRedemptions: { $sum: 1 },
//           totalPointsUsed: { $sum: '$spentPoints' },
//           totalDiscountGiven: { $sum: '$discountAmount' },
//         }
//       }
//     ]).then(r => r[0] || { totalRedemptions: 0, totalPointsUsed: 0, totalDiscountGiven: 0 });

//     // 2. Top 5 Vendors → Total Orders (All) + Redemptions (Only with points)
//     const vendorStats = await Transaction.aggregate([
//       { $match: dateFilter },
//       { $lookup: { from: 'staffs', localField: 'staff', foreignField: '_id', as: 's' } },
//       { $unwind: { path: '$s', preserveNullAndEmptyArrays: true } },
//       { $lookup: { from: 'vendors', localField: 's.vendor', foreignField: '_id', as: 'v' } },
//       { $unwind: { path: '$v', preserveNullAndEmptyArrays: true } },
//       { $match: { 'v.businessName': { $exists: true, $ne: null } } },
//       {
//         $group: {
//           _id: '$v._id',
//           vendorName: { $first: '$v.businessName' },
//           totalOrders: { $sum: 1 },
//           redemptions: {
//             $sum: { $cond: [{ $gt: ['$spentPoints', 0] }, 1, 0] }
//           },
//           totalPoints: { $sum: '$spentPoints' },
//           totalDiscountBHD: { $sum: '$discountAmount' }
//         }
//       },
//       { $sort: { totalDiscountBHD: -1 } },
//       { $limit: 5 },
//       {
//         $project: {
//           _id: 0,
//           vendorId: '$_id',
//           vendorName: 1,
//           totalOrders: 1,
//           redemptions: 1,
//           points: { $ifNull: ['$totalPoints', 0] },
//           totalDiscountBHD: { $round: ['$totalDiscountBHD', 3] }
//         }
//       }
//     ]);

//     // 3. Recent Redemptions (Only with points used)
//     const recentRedemptions = await Transaction.aggregate([
//       {
//         $match: {
//           ...dateFilter,
//           spentPoints: { $gt: 0 },
//           ...(staffIds.length > 0 ? { staff: { $in: staffIds } } : {})
//         }
//       },
//       { $sort: { createdAt: -1 } },
//       { $limit: 100 },
//       { $lookup: { from: 'staffs', localField: 'staff', foreignField: '_id', as: 's' } },
//       { $unwind: { path: '$s', preserveNullAndEmptyArrays: true } },
//       { $lookup: { from: 'vendors', localField: 's.vendor', foreignField: '_id', as: 'v' } },
//       { $unwind: { path: '$v', preserveNullAndEmptyArrays: true } },
//       { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'u' } },
//       { $unwind: { path: '$u', preserveNullAndEmptyArrays: true } },
//       {
//         $project: {
//           date: '$createdAt',
//           customer: { $ifNull: ['$u.name', { $ifNull: ['$u.mobileNumber', 'Guest'] }] },
//           vendor: { $ifNull: ['$v.businessName', 'Unknown Vendor'] },
//           points: '$spentPoints',
//           discount: { $round: ['$discountAmount', 3] },
//           totalAmount: { $round: [{ $ifNull: ['$totalAmount', 0] }, 3] },
//           orderId: { $substr: [{ $toString: '$_id' }, 16, 8] }
//         }
//       }
//     ]);

//     // 4. All Vendors
//     const allVendors = await Vendor.find({ adminApproved: true })
//       .select('_id businessName businessLogo')
//       .sort({ businessName: 1 })
//       .lean();

//     // Console Log
//     const period = (startDate && endDate)
//       ? `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`
//       : 'ALL TIME';

//     res.render('reports', {
//       title: 'Reports & Analytics',
//       summary,
//       topVendors: vendorStats,
//       allVendors,
//       recentRedemptions,
//       filters: {
//         startDate: startDate || '',
//         endDate: endDate || '',
//         vendorId: vendorId || ''
//       }
//     });

//   } catch (error) {
//     console.error('Render Reports Error:', error.message);
//     req.flash('red', 'Failed to load reports');
//     res.redirect('/admin');
//   }
// };

exports.renderReports = async (req, res) => {
    try {
        const { startDate, endDate, vendorId } = req.query;

        let start = new Date('2020-01-01');
        let end = new Date();
        end.setHours(23, 59, 59, 999);

        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        }

        const dateFilter = { createdAt: { $gte: start, $lte: end } };

        // Vendor filter
        let staffIds = [];
        if (vendorId && vendorId !== '' && vendorId !== 'null') {
            const vendorObjectId = new mongoose.Types.ObjectId(vendorId);
            staffIds = await Staff.find({ vendor: vendorObjectId }).distinct(
                '_id'
            );
        }

        const summary = await Transaction.aggregate([
            {
                $match: {
                    ...dateFilter,
                    spentPoints: { $gt: 0 },
                    ...(staffIds.length > 0
                        ? { staff: { $in: staffIds } }
                        : {}),
                },
            },
            {
                $group: {
                    _id: null,
                    totalRedemptions: { $sum: 1 },
                    totalPointsUsed: { $sum: '$spentPoints' },
                    totalDiscountGiven: { $sum: '$discountAmount' },
                },
            },
        ]).then(
            r =>
                r[0] || {
                    totalRedemptions: 0,
                    totalPointsUsed: 0,
                    totalDiscountGiven: 0,
                }
        );

        // 2. Top 5 Vendors
        const vendorStats = await Transaction.aggregate([
            { $match: dateFilter },
            {
                $lookup: {
                    from: 'staffs',
                    localField: 'staff',
                    foreignField: '_id',
                    as: 's',
                },
            },
            { $unwind: { path: '$s', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'vendors',
                    localField: 's.vendor',
                    foreignField: '_id',
                    as: 'v',
                },
            },
            { $unwind: { path: '$v', preserveNullAndEmptyArrays: true } },
            { $match: { 'v.businessName': { $exists: true, $ne: null } } },
            {
                $group: {
                    _id: '$v._id',
                    vendorName: { $first: '$v.businessName' },
                    totalOrders: { $sum: 1 },
                    redemptions: {
                        $sum: { $cond: [{ $gt: ['$spentPoints', 0] }, 1, 0] },
                    },
                    totalPoints: { $sum: '$spentPoints' },
                    totalDiscountBHD: { $sum: '$discountAmount' },
                },
            },
            { $sort: { totalDiscountBHD: -1 } },
            { $limit: 5 },
            {
                $project: {
                    _id: 0,
                    vendorId: '$_id',
                    vendorName: 1,
                    totalOrders: 1,
                    redemptions: 1,
                    points: { $ifNull: ['$totalPoints', 0] },
                    totalDiscountBHD: { $round: ['$totalDiscountBHD', 3] },
                },
            },
        ]);
        // 3. Recent Redemptions — same
        const recentRedemptions = await Transaction.aggregate([
            {
                $match: {
                    ...dateFilter,
                    spentPoints: { $gt: 0 },
                    ...(staffIds.length > 0
                        ? { staff: { $in: staffIds } }
                        : {}),
                },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 100 },
            {
                $lookup: {
                    from: 'staffs',
                    localField: 'staff',
                    foreignField: '_id',
                    as: 's',
                },
            },
            { $unwind: { path: '$s', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'vendors',
                    localField: 's.vendor',
                    foreignField: '_id',
                    as: 'v',
                },
            },
            { $unwind: { path: '$v', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'u',
                },
            },
            { $unwind: { path: '$u', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    date: '$createdAt',
                    customer: {
                        $ifNull: [
                            '$u.name',
                            { $ifNull: ['$u.mobileNumber', 'Guest'] },
                        ],
                    },
                    vendor: { $ifNull: ['$v.businessName', 'Unknown Vendor'] },
                    points: '$spentPoints',
                    discount: { $round: ['$discountAmount', 3] },
                    totalAmount: {
                        $round: [{ $ifNull: ['$totalAmount', 0] }, 3],
                    },
                    orderId: { $substr: [{ $toString: '$_id' }, 16, 8] },
                },
            },
        ]);

        let allVendorStats = await Transaction.aggregate([
            {
                $match: {
                    ...dateFilter,
                    spentPoints: { $gt: 0 },
                },
            },
            {
                $lookup: {
                    from: 'staffs',
                    localField: 'staff',
                    foreignField: '_id',
                    as: 's',
                },
            },
            { $unwind: { path: '$s', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'vendors',
                    localField: 's.vendor',
                    foreignField: '_id',
                    as: 'v',
                },
            },
            { $unwind: { path: '$v', preserveNullAndEmptyArrays: true } },
            { $match: { 'v.businessName': { $exists: true, $ne: null } } },
            {
                $group: {
                    _id: '$v._id',
                    businessName: { $first: '$v.businessName' },
                },
            },
            { $sort: { businessName: 1 } },
        ]);

        let allVendors = allVendorStats;

        if (
            vendorId &&
            vendorId !== '' &&
            vendorId !== 'null' &&
            !allVendors.find(v => v._id.toString() === vendorId)
        ) {
            const selectedVendor = await Vendor.findById(vendorId)
                .select('_id businessName')
                .lean();
            if (selectedVendor) {
                allVendors.push(selectedVendor);
                allVendors.sort((a, b) =>
                    a.businessName.localeCompare(b.businessName)
                );
            }
        }

        const redemptionTrend = await Transaction.aggregate([
            {
                $match: {
                    spentPoints: { $gt: 0 },
                    createdAt: { $gte: start, $lte: end },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$createdAt',
                        },
                    },
                    points: { $sum: '$spentPoints' },
                    redemptions: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Vendor performance for ALL vendors (including those with no transactions)
        // Step 1: Get all vendors
        const allVendorsList = await Vendor.find({
            adminApproved: true,
            isDelete: false,
        })
            .select('_id businessName')
            .lean();

        // Step 2: Get transaction stats by vendor
        const vendorTransactionStats = await Transaction.aggregate([
            {
                $lookup: {
                    from: 'staffs',
                    localField: 'staff',
                    foreignField: '_id',
                    as: 's',
                },
            },
            { $unwind: { path: '$s', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'vendors',
                    localField: 's.vendor',
                    foreignField: '_id',
                    as: 'v',
                },
            },
            { $unwind: { path: '$v', preserveNullAndEmptyArrays: true } },
            { $match: { 'v._id': { $exists: true } } },
            {
                $group: {
                    _id: '$v._id',
                    vendorName: { $first: '$v.businessName' },
                    totalTransactions: { $sum: 1 },
                    totalPointsRedeemed: {
                        $sum: { $ifNull: ['$spentPoints', 0] },
                    },
                    totalDiscountGiven: {
                        $sum: { $ifNull: ['$discountAmount', 0] },
                    },
                    totalAdminCommission: {
                        $sum: { $ifNull: ['$adminCommission', 0] },
                    },
                },
            },
        ]);

        // Step 3: Merge all vendors with transaction stats
        const vendorPerformanceAll = allVendorsList
            .map(vendor => {
                const stats =
                    vendorTransactionStats.find(
                        v => v._id.toString() === vendor._id.toString()
                    ) || {};

                return {
                    vendorId: vendor._id,
                    vendorName: vendor.businessName,
                    totalTransactions: stats.totalTransactions || 0,
                    totalPointsRedeemed: stats.totalPointsRedeemed || 0,
                    totalDiscountGiven: stats.totalDiscountGiven
                        ? parseFloat(stats.totalDiscountGiven.toFixed(3))
                        : 0,
                    totalAdminCommission: stats.totalAdminCommission
                        ? parseFloat(stats.totalAdminCommission.toFixed(3))
                        : 0,
                };
            })
            .sort((a, b) => b.totalTransactions - a.totalTransactions);

        // Users Performance - Get all users with transaction stats
        const allUsersList = await User.find({ isDelete: false })
            .select('_id name mobileNumber email createdAt')
            .lean();

        // Get transaction stats by user
        const userTransactionStats = await Transaction.aggregate([
            {
                $group: {
                    _id: '$user',
                    totalTransactions: { $sum: 1 },
                    totalPointsEarned: {
                        $sum: { $ifNull: ['$earnedPoints', 0] },
                    },
                    totalPointsRedeemed: {
                        $sum: { $ifNull: ['$spentPoints', 0] },
                    },
                    totalSpent: {
                        $sum: { $ifNull: ['$finalAmount', 0] },
                    },
                },
            },
        ]);

        // Merge all users with transaction stats
        const usersPerformanceAll = allUsersList
            .map(user => {
                const stats =
                    userTransactionStats.find(
                        u => u._id && u._id.toString() === user._id.toString()
                    ) || {};

                return {
                    userId: user._id,
                    userName: user.name || user.mobileNumber || 'Guest',
                    mobile: user.mobileNumber,
                    email: user.email,
                    totalTransactions: stats.totalTransactions || 0,
                    totalPointsEarned: stats.totalPointsEarned || 0,
                    totalPointsRedeemed: stats.totalPointsRedeemed || 0,
                    totalSpent: stats.totalSpent
                        ? parseFloat(stats.totalSpent.toFixed(3))
                        : 0,
                };
            })
            .sort((a, b) => b.totalTransactions - a.totalTransactions);

        res.render('reports', {
            title: 'Reports & Analytics',
            summary,
            topVendors: vendorStats,
            allVendors,
            vendorPerformanceAll,
            usersPerformanceAll,
            recentRedemptions,
            redemptionTrend,
            filters: {
                startDate: startDate || '',
                endDate: endDate || '',
                vendorId: vendorId || '',
            },
        });
    } catch (error) {
        console.error('Render Reports Error:', error.message);
        req.flash('red', 'Failed to load reports');
        res.redirect('/admin');
    }
};

// Export CSV for Vendors Performance
exports.exportVendorsPerformance = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let start = new Date('2020-01-01');
        let end = new Date();
        end.setHours(23, 59, 59, 999);

        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        }

        const dateFilter = { createdAt: { $gte: start, $lte: end } };

        const allVendorsList = await Vendor.find({
            adminApproved: true,
            isDelete: false,
        })
            .select('_id businessName')
            .lean();

        const vendorTransactionStats = await Transaction.aggregate([
            { $match: { ...dateFilter } },
            {
                $lookup: {
                    from: 'staffs',
                    localField: 'staff',
                    foreignField: '_id',
                    as: 's',
                },
            },
            { $unwind: { path: '$s', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'vendors',
                    localField: 's.vendor',
                    foreignField: '_id',
                    as: 'v',
                },
            },
            { $unwind: { path: '$v', preserveNullAndEmptyArrays: true } },
            { $match: { 'v._id': { $exists: true } } },
            {
                $group: {
                    _id: '$v._id',
                    vendorName: { $first: '$v.businessName' },
                    totalTransactions: { $sum: 1 },
                    totalPointsRedeemed: {
                        $sum: { $ifNull: ['$spentPoints', 0] },
                    },
                    totalDiscountGiven: {
                        $sum: { $ifNull: ['$discountAmount', 0] },
                    },
                    totalAdminCommission: {
                        $sum: { $ifNull: ['$adminCommission', 0] },
                    },
                },
            },
        ]);

        const vendorPerformanceAll = allVendorsList
            .map(vendor => {
                const stats =
                    vendorTransactionStats.find(
                        v => v._id && v._id.toString() === vendor._id.toString()
                    ) || {};
                return {
                    vendorId: vendor._id,
                    vendorName: vendor.businessName,
                    totalTransactions: stats.totalTransactions || 0,
                    totalPointsRedeemed: stats.totalPointsRedeemed || 0,
                    totalDiscountGiven: stats.totalDiscountGiven
                        ? parseFloat(stats.totalDiscountGiven.toFixed(3))
                        : 0,
                    totalAdminCommission: stats.totalAdminCommission
                        ? parseFloat(stats.totalAdminCommission.toFixed(3))
                        : 0,
                };
            })
            .sort((a, b) => b.totalTransactions - a.totalTransactions);

        // CSV helper
        const escapeCSV = val => {
            if (val === null || val === undefined) return '';
            return '"' + String(val).replace(/"/g, '""') + '"';
        };

        let csv =
            'Vendor ID,Vendor Name,Total Transactions,Points Redeemed,Discount (BHD),Admin Commission (BHD)\n';
        vendorPerformanceAll.forEach(v => {
            csv += `${escapeCSV(v.vendorId)} ,${escapeCSV(v.vendorName)} ,${
                v.totalTransactions
            } ,${v.totalPointsRedeemed} ,${v.totalDiscountGiven} ,${
                v.totalAdminCommission
            }\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=vendors-performance-${Date.now()}.csv`
        );
        res.send(csv);
    } catch (err) {
        console.error('Export Vendors Error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Export CSV for Users Performance
exports.exportUsersPerformance = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let start = new Date('2020-01-01');
        let end = new Date();
        end.setHours(23, 59, 59, 999);

        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        }

        const dateFilter = { createdAt: { $gte: start, $lte: end } };

        const allUsersList = await User.find({ isDelete: false })
            .select('_id name mobileNumber email createdAt')
            .lean();

        const userTransactionStats = await Transaction.aggregate([
            { $match: { ...dateFilter } },
            {
                $group: {
                    _id: '$user',
                    totalTransactions: { $sum: 1 },
                    totalPointsEarned: {
                        $sum: { $ifNull: ['$earnedPoints', 0] },
                    },
                    totalPointsRedeemed: {
                        $sum: { $ifNull: ['$spentPoints', 0] },
                    },
                    totalSpent: { $sum: { $ifNull: ['$finalAmount', 0] } },
                },
            },
        ]);

        const usersPerformanceAll = allUsersList
            .map(user => {
                const stats =
                    userTransactionStats.find(
                        u => u._id && u._id.toString() === user._id.toString()
                    ) || {};
                return {
                    userId: user._id,
                    userName: user.name || user.mobileNumber || 'Guest',
                    mobile: user.mobileNumber,
                    email: user.email,
                    totalTransactions: stats.totalTransactions || 0,
                    totalPointsEarned: stats.totalPointsEarned || 0,
                    totalPointsRedeemed: stats.totalPointsRedeemed || 0,
                    totalSpent: stats.totalSpent
                        ? parseFloat(stats.totalSpent.toFixed(3))
                        : 0,
                };
            })
            .sort((a, b) => b.totalTransactions - a.totalTransactions);

        const escapeCSV = val => {
            if (val === null || val === undefined) return '';
            return '"' + String(val).replace(/"/g, '""') + '"';
        };

        let csv =
            'Name,Mobile,Email,Total Transactions,Points Earned,Points Redeemed,Total Spent (BHD)\n';
        usersPerformanceAll.forEach(u => {
            csv += `${escapeCSV(u.userName)} ,${escapeCSV(
                u.mobile
            )} ,${escapeCSV(u.email)} ,${u.totalTransactions} ,${
                u.totalPointsEarned
            } ,${u.totalPointsRedeemed} ,${u.totalSpent}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=users-performance-${Date.now()}.csv`
        );
        res.send(csv);
    } catch (err) {
        console.error('Export Users Error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

// exports.viewReport = async (req, res) => {
//   try {
//     const transactionId = req.params.id;

//     const transaction = await Transaction.findById(transactionId)
//       .populate('user', 'name mobileNumber')
//       .populate({
//         path: 'staff',
//         populate: { path: 'vendor', select: 'businessName businessLogo' }
//       })
//       .populate('items.menuItem', 'name price')
//       .lean();

//     if (!transaction) {
//       req.flash('red', 'Order not found');
//       return res.redirect('/admin/reports');
//     }

//     const formatDate = (date) => {
//       const d = new Date(date);
//       return d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
//     };

//     const toNumber = (val) => {
//       if (val === null || val === undefined || val === '') return 0;
//       const num = parseFloat(String(val));
//       return isNaN(num) ? 0 : num;
//     };

//     // Items ka subtotal calculate karo
//     const subtotal = (transaction.items || []).reduce((sum, item) => {
//       const price = toNumber(item.price ?? item.menuItem?.price ?? 0);
//       const qty = toNumber(item.quantity) || 1;
//       return sum + (price * qty);
//     }, 0);

//     const order = {
//       orderId: transaction._id,
//       orderIdShort: transaction._id.toString().slice(-8).toUpperCase(),
//       date: formatDate(transaction.createdAt),

//       customerName: transaction.user ? (transaction.user.name || transaction.user.mobileNumber || 'Guest') : 'Guest',
//       customerMobile: transaction.user?.mobileNumber || 'N/A',

//       vendorName: transaction.staff?.vendor?.businessName || 'Unknown Vendor',
//       vendorLogo: transaction.staff?.vendor?.businessLogo || 'https://img.freepik.com/free-photo/abstract-flowing-neon-wave-background_53876-101942.jpg?semt=ais_se_enriched&w=740&q=80',
//       staffName: transaction.staff?.name || 'Unknown Staff',

//       items: (transaction.items || []).map(item => {
//         const price = toNumber(item.price ?? item.menuItem?.price ?? 0);
//         const quantity = toNumber(item.quantity) || 1;
//         const total = price * quantity;

//         return {
//           name: item.menuItem?.name || item.itemName || 'Unknown Item',
//           quantity: quantity,
//           price: price.toFixed(3),
//           total: total.toFixed(3)
//         };
//       }),

//       // Yeh sab fields aapke DB ke hisaab se
//       subtotal: subtotal.toFixed(3),
//       pointsUsed: toNumber(transaction.spentPoints || 0),
//       discountAmount: toNumber(transaction.discountAmount || 0).toFixed(3),

//       // Yeh sabse important — aapke DB mein finalAmount hai!
//       totalAmount: toNumber(transaction.finalAmount || transaction.billAmount || 0).toFixed(3),

//       // Status — aapke DB mein "accepted" hai matlab paid!
//       // paymentStatus: transaction.status === 'accepted' || transaction.status === 'completed' || transaction.paid === true
//       //   ? 'Paid'
//       //   : 'Pending'

//       paymentStatus: (() => {
//         switch (transaction.status) {
//           case 'accepted': return 'Paid';
//           case 'pending': return 'Pending';
//           case 'rejected': return 'Rejected';
//           case 'expired': return 'Expired';
//           default: return 'Unknown';
//         }
//       })(),

//     };

//     res.render('reports_view', {
//       title: `Order #${order.orderIdShort}`,
//       order
//     });

//   } catch (error) {
//     console.error('View Report Error:', error.message);
//     req.flash('red', 'Server Error');
//     res.redirect('/admin/reports');
//   }
// };

exports.viewReport = async (req, res) => {
    try {
        const transactionId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(transactionId)) {
            req.flash('red', 'Invalid Order ID');
            return res.redirect('/admin/reports');
        }

        const transaction = await Transaction.findById(transactionId)
            .populate('user', 'name mobileNumber')
            .populate({
                path: 'staff',
                populate: {
                    path: 'vendor',
                    select: 'businessName businessLogo',
                },
            })
            .populate('items.menuItem', 'name price')
            .lean();

        if (!transaction) {
            req.flash('red', 'Order not found');
            return res.redirect('/admin/reports');
        }

        const formatDate = date => {
            const d = new Date(date);
            return (
                d.toLocaleDateString('en-GB') +
                ' ' +
                d.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                })
            );
        };

        const toNumber = val => {
            if (val === null || val === undefined || val === '') return 0;
            const num = parseFloat(String(val));
            return isNaN(num) ? 0 : num;
        };

        const subtotal = (transaction.items || []).reduce((sum, item) => {
            const price = toNumber(item.price ?? item.menuItem?.price ?? 0);
            const qty = toNumber(item.quantity) || 1;
            return sum + price * qty;
        }, 0);

        const order = {
            orderId: transaction._id,
            orderIdShort: transaction._id.toString().slice(-8).toUpperCase(),
            date: formatDate(transaction.createdAt),

            customerName: transaction.user
                ? transaction.user.name ||
                  transaction.user.mobileNumber ||
                  'Guest'
                : 'Guest',
            customerMobile: transaction.user?.mobileNumber || 'N/A',

            vendorName:
                transaction.staff?.vendor?.businessName || 'Unknown Vendor',
            vendorLogo: transaction.staff?.vendor?.businessLogo
                ? process.env.IMAGE_URL + transaction.staff.vendor.businessLogo
                : '/img/default-vendor.jpg',
            staffName: transaction.staff?.name || 'Unknown Staff',

            items: (transaction.items || []).map(item => {
                const price = toNumber(item.price ?? item.menuItem?.price ?? 0);
                const quantity = toNumber(item.quantity) || 1;
                const total = price * quantity;

                return {
                    name:
                        item.menuItem?.name || item.itemName || 'Unknown Item',
                    quantity: quantity,
                    price: price.toFixed(3),
                    total: total.toFixed(3),
                };
            }),

            subtotal: subtotal.toFixed(3),
            pointsUsed: toNumber(transaction.spentPoints || 0),
            discountAmount: toNumber(transaction.discountAmount || 0).toFixed(
                3
            ),
            totalAmount: toNumber(
                transaction.finalAmount ||
                    transaction.billAmount ||
                    subtotal ||
                    0
            ).toFixed(3),

            paymentStatus: (() => {
                switch (transaction.status) {
                    case 'accepted':
                        return 'Paid';
                    case 'pending':
                        return 'Pending';
                    case 'rejected':
                        return 'Rejected';
                    case 'expired':
                        return 'Expired';
                    default:
                        return 'Unknown';
                }
            })(),
        };

        res.render('reports_view', {
            title: `Order #${order.orderIdShort}`,
            order,
        });
    } catch (error) {
        console.error('View Report Error:', error.message);
        req.flash('red', 'Invalid request or order not found');
        res.redirect('/admin/reports');
    }
};
