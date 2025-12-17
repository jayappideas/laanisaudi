const User = require('../../models/userModel');
const userNotificationModel = require('../../models/userNotificationModel');
const {
    sendNotificationsToTokens,
} = require('../../utils/sendNotificationStaff');
const mongoose = require("mongoose")
const Transaction = require("../../models/transactionModel")

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ isDelete: false })
            .select(
                'qrCode name mobileNumber birthDate gender createdAt isActive'
            )
            .sort('-_id');

        res.render('user', { users });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin');
    }
};
 

// exports.viewUser = async (req, res) => {
//   try {
//     const user = await User.findById(req.params.id).lean();

//     if (!user) {
//       req.flash('red', 'User not found!');
//       return res.redirect('/admin/user');
//     }

//     // Calculate Real-time Stats
//     const stats = await Transaction.aggregate([
//       { $match: { user: user._id } },
//       {
//         $group: {
//           _id: null,
//           totalOrders: { $sum: 1 },
//           totalEarned: { $sum: '$earnedPoints' },
//           totalRedeemed: { $sum: '$spentPoints' }
//         }
//       }
//     ]);

//     const calculated = stats[0] || { totalOrders: 0, totalEarned: 0, totalRedeemed: 0 };

//     user.totalPoints = calculated.totalEarned;
//     user.pointsRedeemed = calculated.totalRedeemed;
//     user.totalOrders = calculated.totalOrders;
//     user.currentPoints = (user.points || 0);

//     res.render('user_view', { user });

//   } catch (error) {
//     console.error(error);
//     req.flash('red', 'Server Error');
//     res.redirect('/admin/user');
//   }
// };


// exports.viewUser = async (req, res) => {
//   try {
//     const user = await User.findById(req.params.id).lean();

//     if (!user) {
//       req.flash('red', 'User not found!');
//       return res.redirect('/admin/user');
//     }

//     // Calculate Real-time Stats
//     const stats = await Transaction.aggregate([
//       { $match: { user: user._id } },
//       {
//         $group: {
//           _id: null,
//           totalOrders: { $sum: 1 },
//           totalEarned: { $sum: '$earnedPoints' },
//           totalRedeemed: { $sum: '$spentPoints' }
//         }
//       }
//     ]);

//     const calculated = stats[0] || { totalOrders: 0, totalEarned: 0, totalRedeemed: 0 };

//     user.totalPoints = calculated.totalEarned;
//     user.pointsRedeemed = calculated.totalRedeemed;
//     user.totalOrders = calculated.totalOrders;
//     user.currentPoints = (user.points || 0);

//     res.render('user_view', { 
//       title: 'User View',
//       user 
//     });

//   } catch (error) {
//     console.error('User View Error:', error);
//     req.flash('red', 'Server Error');
//     res.redirect('/admin/user');
//   }
// };

exports.viewUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();

    if (!user) {
      req.flash('red', 'User not found!');
      return res.redirect('/admin/user');
    }

    // === STATS ===
    const stats = await Transaction.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalEarned: { $sum: '$earnedPoints' },
          totalRedeemed: { $sum: '$spentPoints' }
        }
      }
    ]);

    const calculated = stats[0] || { totalOrders: 0, totalEarned: 0, totalRedeemed: 0 };

    // === REDEMPTIONS WITH BRANCH NAME ===
    const redemptions = await Transaction.find({
      user: user._id,
      spentPoints: { $gt: 0 }
    })
    .populate({
      path: 'staff',
      select: 'name',
      populate: [
        { path: 'vendor', select: 'businessName' },
        { path: 'branch', select: 'buildingName' } 
      ]
    })
    .populate('items.menuItem', 'name')
    .select('createdAt spentPoints discountAmount items staff _id')
    .sort({ createdAt: -1 })
    .lean();

    const redemptionHistory = redemptions.map(r => ({
      date: r.createdAt,
      vendorName: r.staff?.vendor?.businessName || 'Unknown Vendor',
      branchName: r.staff?.branch?.buildingName || '—', 
      productName: r.items?.[0]?.menuItem?.name || 'General Discount',
      pointsRedeemed: r.spentPoints || 0,
      discountGiven: r.discountAmount || 0,
      transactionId: r._id
    }));

    // Attach stats
    user.totalPoints = calculated.totalEarned;
    user.pointsRedeemed = calculated.totalRedeemed;
    user.totalOrders = calculated.totalOrders;
    user.currentPoints = user.points || 0;

    // console.log('branch : ',redemptionHistory)

    res.render('user_view', { 
      title: 'User Profile',
      user,
      redemptions: redemptionHistory
    });

  } catch (error) {
    console.error('User View Error:', error);
    req.flash('red', 'Server Error');
    res.redirect('/admin/user');
  }
};



exports.changeUserStatus = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            req.flash('red', 'User not found.');
            return res.redirect('/admin/user');
        }

        user.isActive = req.params.status;

        await user.save();

        req.flash('green', 'Status changed successfully.');
        res.redirect('/admin/user');
    } catch (error) {
        if (error.name === 'CastError' || error.name === 'TypeError')
            req.flash('red', 'User not found!');
        else req.flash('red', error.message);
        res.redirect('/admin/user');
    }
};

exports.getDeleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);

        req.flash('green', 'User deleted successfully.');
        res.redirect('/admin/user');
    } catch (error) {
        if (error.name === 'CastError' || error.name === 'TypeError')
            req.flash('red', 'User not found!');
        else req.flash('red', error.message);
        res.redirect('/admin/user');
    }
};

exports.sendNotification = async (req, res) => {
    try {
        const { title, body, selectedUserIds } = req.body;

        const userIds = selectedUserIds.split(',');

        const users = await User.find({
            _id: { $in: userIds },
            isNotification: 1,
        })
            .select('fcmToken')
            .lean();

        const fcmTokens = users.map(user => user.fcmToken);
        const usersWithNotification = users.map(user => user._id);
        const data = {
            type: 'admin_notification'
        };
        await sendNotificationsToTokens(title, body, fcmTokens, data);

        await userNotificationModel.create({
            sentTo: usersWithNotification,
            title,
            body,
        });

        req.flash('green', 'Notification sent successfully.');
        res.redirect('/admin/user');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/user');
    }
};

exports.deleteAccountUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        // const modifiedEmail = `${user.email}_deleted_${Date.now()}`;
        const modifiedMobileNumber = `${user.mobileNumber
            }_deleted_${Date.now()}`;

        user.isDelete = true;
        user.token = '';
        user.fcmToken = '';
        // user.email = modifiedEmail;
        user.mobileNumber = modifiedMobileNumber;

        //Points Removed

        await user.save();

        req.flash('green', 'User deleted successfully.');
        res.redirect('/admin/user');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/user');
    }
};

// exports.getUserRedemptions = async (req, res) => {
//   try {
//     const { userId, startDate, endDate, vendorId } = req.query;

//     if (!userId) {
//       return res.status(400).json({ success: false, message: "User ID required" });
//     }

//     const filter = {
//       user: new mongoose.Types.ObjectId(userId),
//       spentPoints: { $gt: 0 }
//     };

//     if (startDate) {
//       filter.createdAt = { $gte: new Date(startDate) };
//     }
//     if (endDate) {
//       const end = new Date(endDate);
//       end.setHours(23, 59, 59, 999);
//       filter.createdAt = filter.createdAt 
//         ? { ...filter.createdAt, $lte: end }
//         : { $lte: end };
//     }
//     if (vendorId && vendorId !== 'null' && vendorId !== '') {
//       filter['staff.vendor'] = new mongoose.Types.ObjectId(vendorId);
//     }

//     const redemptions = await Transaction.aggregate([
//       { $match: filter },

//       // Lookup Staff → Vendor
//       {
//         $lookup: {
//           from: 'staffs',
//           localField: 'staff',
//           foreignField: '_id',
//           as: 'staffInfo'
//         }
//       },
//       { $unwind: { path: '$staffInfo', preserveNullAndEmptyArrays: true } },

//       {
//         $lookup: {
//           from: 'vendors',
//           localField: 'staffInfo.vendor',
//           foreignField: '_id',
//           as: 'vendorInfo'
//         }
//       },
//       { $unwind: { path: '$vendorInfo', preserveNullAndEmptyArrays: true } },

//       // Lookup Customer (optional)
//       {
//         $lookup: {
//           from: 'users',
//           localField: 'user',
//           foreignField: '_id',
//           as: 'userInfo'
//         }
//       },
//       { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },

//       // Unwind items and lookup product
//       { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
//       {
//         $lookup: {
//           from: 'menuitems',
//           localField: 'items.menuItem',
//           foreignField: '_id',
//           as: 'productInfo'
//         }
//       },
//       { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },

//       // Group back to transaction level
//       {
//         $group: {
//           _id: '$_id',
//           date: { $first: '$createdAt' },
//           transactionId: { $first: '$_id' },
//           vendorName: { $first: { $ifNull: ['$vendorInfo.businessName', 'Unknown Vendor'] } },
//           productName: { $first: { $ifNull: ['$productInfo.name', 'General Discount'] } },
//           pointsRedeemed: { $first: '$spentPoints' },
//           discountGiven: { $first: '$discountAmount' }
//         }
//       },

//       { $sort: { date: -1 } }
//     ]);

//     res.json({ success: true, redemptions });

//   } catch (err) {
//     console.error("Redemption Load Error:", err);
//     res.status(500).json({ success: false, message: "Server Error: " + err.message });
//   }
// };

// exports.getUserRedemptions = async (req, res) => {
//   try {
//     const { userId, startDate, endDate, vendorId } = req.query;

//     if (!userId) {
//       return res.status(400).json({ success: false, message: "User ID required" });
//     }

//     const filter = {
//       user: new mongoose.Types.ObjectId(userId),
//       spentPoints: { $gt: 0 }
//     };

//     if (startDate) {
//       filter.createdAt = { $gte: new Date(startDate) };
//     }
//     if (endDate) {
//       const end = new Date(endDate);
//       end.setHours(23, 59, 59, 999);
//       filter.createdAt = filter.createdAt 
//         ? { ...filter.createdAt, $lte: end }
//         : { $lte: end };
//     }
//     if (vendorId && vendorId !== 'null' && vendorId !== '') {
//       filter['staff.vendor'] = new mongoose.Types.ObjectId(vendorId);
//     }

//     const redemptions = await Transaction.aggregate([
//       { $match: filter },

//       // 1. Staff → Vendor
//       {
//         $lookup: {
//           from: 'staffs',
//           localField: 'staff',
//           foreignField: '_id',
//           as: 'staffInfo'
//         }
//       },
//       { $unwind: { path: '$staffInfo', preserveNullAndEmptyArrays: true } },

//       // 2. Vendor Name
//       {
//         $lookup: {
//           from: 'vendors',
//           localField: 'staffInfo.vendor',
//           foreignField: '_id',
//           as: 'vendorInfo'
//         }
//       },
//       { $unwind: { path: '$vendorInfo', preserveNullAndEmptyArrays: true } },

//       {
//         $lookup: {
//           from: 'branches',
//           localField: 'staffInfo.branch',
//           foreignField: '_id',
//           as: 'branchInfo'
//         }
//       },
//       { $unwind: { path: '$branchInfo', preserveNullAndEmptyArrays: true } },

//       // 4. Menu Item
//       { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
//       {
//         $lookup: {
//           from: 'menuitems',
//           localField: 'items.menuItem',
//           foreignField: '_id',
//           as: 'productInfo'
//         }
//       },
//       { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },

//       {
//         $group: {
//           _id: '$_id',
//           date: { $first: '$createdAt' },
//           transactionId: { $first: '$_id' },
//           vendorName: { $first: { $ifNull: ['$vendorInfo.businessName', 'Unknown Vendor'] } },
//           branchName: { $first: { $ifNull: ['$branchInfo.name', 'Main Branch'] } },  // ← YE NAYA HAI
//           productName: { $first: { $ifNull: ['$productInfo.name', 'General Discount'] } },
//           pointsRedeemed: { $first: '$spentPoints' },
//           discountGiven: { $first: '$discountAmount' }
//         }
//       },

//       { $sort: { date: -1 } }
//     ]);

//     res.json({ success: true, redemptions });

//   } catch (err) {
//     console.error("Redemption Load Error:", err);
//     res.status(500).json({ success: false, message: "Server Error" });
//   }
// };

exports.getUserRedemptions = async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    let filter = {
      user: new mongoose.Types.ObjectId(userId),
      spentPoints: { $gt: 0 }
    };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // YE TUMHARA 100% WORKING CODE HAI — JO PEHLE COMMENT KIYA THA
    const redemptions = await Transaction.aggregate([
      { $match: filter },

      // Staff se vendor aur branch nikaalo
      {
        $lookup: {
          from: 'staffs',
          localField: 'staff',
          foreignField: '_id',
          as: 'staffInfo'
        }
      },
      { $unwind: { path: '$staffInfo', preserveNullAndEmptyArrays: true } },

      // Vendor lookup
      {
        $lookup: {
          from: 'vendors',
          localField: 'staffInfo.vendor',
          foreignField: '_id',
          as: 'vendorInfo'
        }
      },
      { $unwind: { path: '$vendorInfo', preserveNullAndEmptyArrays: true } },

      // Branch lookup
      {
        $lookup: {
          from: 'branches',                  
          localField: 'staffInfo.branch',
          foreignField: '_id',
          as: 'branchInfo'
        }
      },
      { $unwind: { path: '$branchInfo', preserveNullAndEmptyArrays: true } },

      // Menu items (optional)
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'menuitems',
          localField: 'items.menuItem',
          foreignField: '_id',
          as: 'itemInfo'
        }
      },
      { $unwind: { path: '$itemInfo', preserveNullAndEmptyArrays: true } },

      // Final grouping
      {
        $group: {
          _id: '$_id',
          date: { $first: '$createdAt' },
          transactionId: { $first: '$_id' },
          vendorName: { $first: { $ifNull: ['$vendorInfo.businessName', 'Unknown Vendor'] } },
          branchName: { 
            $first: { 
              $ifNull: ['$branchInfo.buildingName', { $ifNull: ['$branchInfo.name', '—'] }] 
            } 
          },
          productName: { $first: { $ifNull: ['$itemInfo.name', 'General Discount'] } },
          pointsRedeemed: { $first: '$spentPoints' },
          discountGiven: { $first: '$discountAmount' }
        }
      },

      { $sort: { date: -1 } }
    ]);

    console.log("Total Redemptions Found:", redemptions.length);
    if (redemptions.length > 0) {
      console.log("Sample:", {
        vendor: redemptions[0].vendorName,
        branch: redemptions[0].branchName,
        points: redemptions[0].pointsRedeemed
      });
    }

    res.json({ success: true, redemptions });

  } catch (error) {
    console.error('Get Redemptions Error:', error.message);
    res.status(500).json({ success: false, redemptions: [] });
  }
};

