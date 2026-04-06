const Transaction = require('../../models/transactionModel');
const User = require('../../models/userModel');
const Vendor = require('../../models/vendorModel');
const Staff = require('../../models/staffModel');
const mongoose = require('mongoose');

const toObjectId = id => new mongoose.Types.ObjectId(id.toString());

// ✅ Status NAHI - sirf date filter
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
            status: 'accepted',
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
                status: activeUserIds.includes(user._id.toString()) ? 'Active' : 'Inactive',
                lastActive: user.lastLogin || null,
            }))
            .sort((a, b) => b.registeredAt - a.registeredAt);

        res.json({
            success: true,
            totalUsers: users.length,
            activeUsers: activeUserIds.length,
            inactiveUsers: users.length - activeUserIds.length,
            newUsersThisMonth: users.filter(
                u => new Date(u.createdAt) > new Date().setMonth(new Date().getMonth() - 1)
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
            ...dateFilter,
            spentPoints: { $gt: 0 },
        };

        if (vendorId) filter['staff.vendor'] = toObjectId(vendorId);
        if (minPoints) filter.spentPoints = { $gte: parseInt(minPoints) };

        const redemptions = await Transaction.aggregate([
            { $match: filter },
            { $lookup: { from: 'staffs', localField: 'staff', foreignField: '_id', as: 'staffInfo' } },
            { $unwind: { path: '$staffInfo', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'vendors', localField: 'staffInfo.vendor', foreignField: '_id', as: 'vendorInfo' } },
            { $unwind: { path: '$vendorInfo', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'customerInfo' } },
            { $unwind: { path: '$customerInfo', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'menuitems', localField: 'items.menuItem', foreignField: '_id', as: 'productInfo' } },
            { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$_id',
                    date: { $first: '$createdAt' },
                    customerName: { $first: '$customerInfo.name' },
                    mobile: { $first: '$customerInfo.mobile' },
                    vendorName: { $first: { $ifNull: ['$vendorInfo.businessName', 'Unknown Vendor'] } },
                    productName: { $first: { $ifNull: ['$productInfo.name', 'Unknown Item'] } },
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
            summary: summary[0] || { totalRedemptions: 0, totalPointsRedeemed: 0, totalDiscountValue: 0 },
            redemptions,
            filtersApplied: { startDate, endDate, vendorId, minPoints },
        });
    } catch (err) {
        console.error('Redemption Analytics Error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getVendorPerformance = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const dateFilter = buildDateFilter(startDate, endDate);

        const vendorStats = await Transaction.aggregate([
            { $match: dateFilter },
            { $lookup: { from: 'staffs', localField: 'staff', foreignField: '_id', as: 'staffInfo' } },
            { $unwind: { path: '$staffInfo', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'vendors', localField: 'staffInfo.vendor', foreignField: '_id', as: 'vendorInfo' } },
            { $unwind: { path: '$vendorInfo', preserveNullAndEmptyArrays: true } },
            { $match: { 'vendorInfo._id': { $exists: true } } },
            {
                $group: {
                    _id: '$vendorInfo._id',
                    vendorName: { $first: '$vendorInfo.businessName' },
                    vendorLogo: { $first: '$vendorInfo.logo' },
                    totalTransactions: { $sum: 1 },
                    totalRevenue: { $sum: '$finalAmount' },
                    totalRedemptions: { $sum: { $cond: [{ $gt: ['$spentPoints', 0] }, 1, 0] } },
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
        res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
    }
};

exports.getRedemptionTrends = async (req, res) => {
    try {
        const { period = 'daily' } = req.query;

        const groupBy = period === 'monthly'
            ? { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }
            : { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } };

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

        res.json({ success: true, period, trends });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.renderReports = async (req, res) => {
    try {
        const { startDate, endDate, vendorId } = req.query;

        // ✅ Default: last 24 hours if no filter supplied
        const isDefaultRange = !startDate && !endDate;

        let start, end;
        if (isDefaultRange) {
            end = new Date();
            end.setHours(23, 59, 59, 999);
            start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
            start.setHours(0, 0, 0, 0);
        } else {
            start = new Date(startDate || '2020-01-01');
            end = new Date(endDate || new Date());
            end.setHours(23, 59, 59, 999);
        }

        const dateFilter     = { createdAt: { $gte: start, $lte: end } };
        // ✅ acceptedFilter now scoped to selected date range for ALL tables
        const acceptedFilter = { status: 'accepted', createdAt: { $gte: start, $lte: end } };

        // Vendor → staff IDs for filter
        let staffIds = [];
        if (vendorId && vendorId !== '' && vendorId !== 'null') {
            const vendorObjectId = new mongoose.Types.ObjectId(vendorId);
            staffIds = await Staff.find({ vendor: vendorObjectId }).distinct('_id');
        }

        // ── Run all heavy queries in parallel ────────────────────────────────
        const [
            summaryRaw,
            vendorStats,
            recentRedemptions,
            allVendorStats,
            redemptionTrend,
            allVendorsList,
            vendorTransactionStats,  // ✅ now date-scoped
            allUsersList,
            userTransactionStats,    // ✅ now date-scoped
        ] = await Promise.all([

            // 1. Summary (accepted + points used, date-scoped)
            Transaction.aggregate([
                {
                    $match: {
                        ...acceptedFilter,
                        spentPoints: { $gt: 0 },
                        ...(staffIds.length > 0 ? { staff: { $in: staffIds } } : {}),
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalRedemptions:  { $sum: 1 },
                        totalPointsUsed:   { $sum: '$spentPoints' },
                        totalDiscountGiven:{ $sum: '$discountAmount' },
                    },
                },
            ]),

            // 2. Top 5 Vendors (accepted, date-scoped)
            Transaction.aggregate([
                { $match: acceptedFilter },
                { $lookup: { from: 'staffs', localField: 'staff', foreignField: '_id', as: 's' } },
                { $unwind: { path: '$s', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: 'vendors', localField: 's.vendor', foreignField: '_id', as: 'v' } },
                { $unwind: { path: '$v', preserveNullAndEmptyArrays: true } },
                { $match: { 'v.businessName': { $exists: true, $ne: null } } },
                {
                    $group: {
                        _id: '$v._id',
                        vendorName:       { $first: '$v.businessName' },
                        totalOrders:      { $sum: 1 },
                        redemptions:      { $sum: { $cond: [{ $gt: ['$spentPoints', 0] }, 1, 0] } },
                        totalPoints:      { $sum: '$spentPoints' },
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
            ]),

            // 3. Recent Redemptions – accepted, 500 limit, date-scoped
            Transaction.aggregate([
                {
                    $match: {
                        status: 'accepted',
                        createdAt: { $gte: start, $lte: end },
                        ...(staffIds.length > 0 ? { staff: { $in: staffIds } } : {}),
                    },
                },
                { $sort: { createdAt: -1 } },
                { $lookup: { from: 'staffs', localField: 'staff', foreignField: '_id', as: 's' } },
                { $unwind: { path: '$s', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: 'vendors', localField: 's.vendor', foreignField: '_id', as: 'v' } },
                { $unwind: { path: '$v', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'u' } },
                { $unwind: { path: '$u', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        date:         '$createdAt',
                        customer:     { $ifNull: ['$u.name', { $ifNull: ['$u.mobileNumber', 'Guest'] }] },
                        vendor:       { $ifNull: ['$v.businessName', 'Unknown Vendor'] },
                        points:       '$spentPoints',
                        pointsEarned: { $ifNull: ['$earnedPoints', 0] },
                        discount:     { $round: ['$discountAmount', 3] },
                        totalAmount:  { $round: [{ $ifNull: ['$totalAmount', 0] }, 3] },
                        orderId:      { $substr: [{ $toString: '$_id' }, 16, 8] },
                    },
                },
            ]),

            // 4. Vendor dropdown list (date-scoped)
            Transaction.aggregate([
                { $match: { ...dateFilter, spentPoints: { $gt: 0 } } },
                { $lookup: { from: 'staffs', localField: 'staff', foreignField: '_id', as: 's' } },
                { $unwind: { path: '$s', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: 'vendors', localField: 's.vendor', foreignField: '_id', as: 'v' } },
                { $unwind: { path: '$v', preserveNullAndEmptyArrays: true } },
                { $match: { 'v.businessName': { $exists: true, $ne: null } } },
                { $group: { _id: '$v._id', businessName: { $first: '$v.businessName' } } },
                { $sort: { businessName: 1 } },
            ]),

            // 5. Redemption Trend chart (date-scoped)
            Transaction.aggregate([
                { $match: { status: 'accepted', spentPoints: { $gt: 0 }, createdAt: { $gte: start, $lte: end } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        points:      { $sum: '$spentPoints' },
                        redemptions: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),

            // 6. All vendors list (for performance table)
            Vendor.find({ adminApproved: true, isDelete: false })
                .select('_id businessName')
                .lean(),

            // 7. ✅ Vendor transaction stats — NOW date-scoped (accepted + date range)
            Transaction.aggregate([
                { $match: acceptedFilter },   // ← was { status: 'accepted' } (all-time), now date-scoped
                { $lookup: { from: 'staffs', localField: 'staff', foreignField: '_id', as: 's' } },
                { $unwind: { path: '$s', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: 'vendors', localField: 's.vendor', foreignField: '_id', as: 'v' } },
                { $unwind: { path: '$v', preserveNullAndEmptyArrays: true } },
                { $match: { 'v._id': { $exists: true } } },
                {
                    $group: {
                        _id: '$v._id',
                        vendorName:           { $first: '$v.businessName' },
                        totalTransactions:    { $sum: 1 },
                        totalPointsRedeemed:  { $sum: { $ifNull: ['$spentPoints', 0] } },
                        totalDiscountGiven:   { $sum: { $ifNull: ['$discountAmount', 0] } },
                        totalAdminCommission: { $sum: { $ifNull: ['$adminCommission', 0] } },
                    },
                },
            ]),

            // 8. All users list
            User.find({ isDelete: false })
                .select('_id name mobileNumber email createdAt')
                .lean(),

            // 9. ✅ User transaction stats — NOW date-scoped (accepted + date range)
            Transaction.aggregate([
                { $match: acceptedFilter },   // ← was { status: 'accepted' } (all-time), now date-scoped
                {
                    $group: {
                        _id: '$user',
                        totalTransactions:   { $sum: 1 },
                        totalPointsEarned:   { $sum: { $ifNull: ['$earnedPoints', 0] } },
                        totalPointsRedeemed: { $sum: { $ifNull: ['$spentPoints', 0] } },
                        totalSpent:          { $sum: { $ifNull: ['$finalAmount', 0] } },
                    },
                },
            ]),
        ]);

        // ── Post-process parallel results ─────────────────────────────────────
        const summary = summaryRaw[0] || { totalRedemptions: 0, totalPointsUsed: 0, totalDiscountGiven: 0 };

        // Vendor dropdown: ensure selected vendor is always present
        let allVendors = allVendorStats;
        if (
            vendorId && vendorId !== '' && vendorId !== 'null' &&
            !allVendors.find(v => v._id.toString() === vendorId)
        ) {
            const selectedVendor = await Vendor.findById(vendorId).select('_id businessName').lean();
            if (selectedVendor) {
                allVendors.push(selectedVendor);
                allVendors.sort((a, b) => a.businessName.localeCompare(b.businessName));
            }
        }

        // ✅ Vendor performance table — now shows stats for selected date range only
        const vendorPerformanceAll = allVendorsList
            .map(vendor => {
                const stats = vendorTransactionStats.find(v => v._id.toString() === vendor._id.toString()) || {};
                return {
                    vendorId:             vendor._id,
                    vendorName:           vendor.businessName,
                    totalTransactions:    stats.totalTransactions    || 0,
                    totalPointsRedeemed:  stats.totalPointsRedeemed  || 0,
                    totalDiscountGiven:   stats.totalDiscountGiven   ? parseFloat(stats.totalDiscountGiven.toFixed(3))   : 0,
                    totalAdminCommission: stats.totalAdminCommission ? parseFloat(stats.totalAdminCommission.toFixed(3)) : 0,
                };
            })
            .sort((a, b) => b.totalTransactions - a.totalTransactions);

        // ✅ Users performance table — now shows stats for selected date range only
        const usersPerformanceAll = allUsersList
            .map(user => {
                const stats = userTransactionStats.find(u => u._id && u._id.toString() === user._id.toString()) || {};
                return {
                    userId:              user._id,
                    userName:            user.name || user.mobileNumber || 'Guest',
                    mobile:              user.mobileNumber,
                    email:               user.email,
                    totalTransactions:   stats.totalTransactions   || 0,
                    totalPointsEarned:   stats.totalPointsEarned   || 0,
                    totalPointsRedeemed: stats.totalPointsRedeemed || 0,
                    totalSpent:          stats.totalSpent ? parseFloat(stats.totalSpent.toFixed(3)) : 0,
                };
            })
            .sort((a, b) => b.totalTransactions - a.totalTransactions);

        // Format start/end for display in the template
        const fmt = d => d.toISOString().split('T')[0];

        res.render('reports', {
            title: 'Reports & Analytics',
            summary,
            topVendors: vendorStats,
            allVendors,
            vendorPerformanceAll,
            usersPerformanceAll,
            recentRedemptions,
            redemptionTrend,
            isDefaultRange,
            filters: {
                startDate: startDate || fmt(start),
                endDate:   endDate   || fmt(end),
                vendorId:  vendorId  || '',
            },
        });

    } catch (error) {
        console.error('Render Reports Error:', error.message);
        req.flash('red', 'Failed to load reports');
        res.redirect('/admin');
    }
};

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

        // ✅ accepted + date-scoped for export
        const dateFilter = { status: 'accepted', createdAt: { $gte: start, $lte: end } };

        const allVendorsList = await Vendor.find({ adminApproved: true, isDelete: false })
            .select('_id businessName').lean();

        const vendorTransactionStats = await Transaction.aggregate([
            { $match: dateFilter },
            { $lookup: { from: 'staffs', localField: 'staff', foreignField: '_id', as: 's' } },
            { $unwind: { path: '$s', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'vendors', localField: 's.vendor', foreignField: '_id', as: 'v' } },
            { $unwind: { path: '$v', preserveNullAndEmptyArrays: true } },
            { $match: { 'v._id': { $exists: true } } },
            {
                $group: {
                    _id: '$v._id',
                    totalTransactions:    { $sum: 1 },
                    totalPointsRedeemed:  { $sum: { $ifNull: ['$spentPoints', 0] } },
                    totalDiscountGiven:   { $sum: { $ifNull: ['$discountAmount', 0] } },
                    totalAdminCommission: { $sum: { $ifNull: ['$adminCommission', 0] } },
                },
            },
        ]);

        const vendorPerformanceAll = allVendorsList
            .map(vendor => {
                const stats = vendorTransactionStats.find(
                    v => v._id && v._id.toString() === vendor._id.toString()
                ) || {};
                return {
                    vendorId:             vendor._id,
                    vendorName:           vendor.businessName,
                    totalTransactions:    stats.totalTransactions    || 0,
                    totalPointsRedeemed:  stats.totalPointsRedeemed  || 0,
                    totalDiscountGiven:   stats.totalDiscountGiven   ? parseFloat(stats.totalDiscountGiven.toFixed(3))   : 0,
                    totalAdminCommission: stats.totalAdminCommission ? parseFloat(stats.totalAdminCommission.toFixed(3)) : 0,
                };
            })
            .sort((a, b) => b.totalTransactions - a.totalTransactions);

        const escapeCSV = val => {
            if (val === null || val === undefined) return '';
            return '"' + String(val).replace(/"/g, '""') + '"';
        };

        let csv = 'Vendor ID,Vendor Name,Total Transactions,Points Redeemed,Discount (BHD),Admin Commission (BHD)\n';
        vendorPerformanceAll.forEach(v => {
            csv += `${escapeCSV(v.vendorId)},${escapeCSV(v.vendorName)},${v.totalTransactions},${v.totalPointsRedeemed},${v.totalDiscountGiven},${v.totalAdminCommission}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=vendors-performance-${Date.now()}.csv`);
        res.send(csv);
    } catch (err) {
        console.error('Export Vendors Error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

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

        // ✅ accepted + date-scoped for export
        const dateFilter = { status: 'accepted', createdAt: { $gte: start, $lte: end } };

        const allUsersList = await User.find({ isDelete: false })
            .select('_id name mobileNumber').lean();

        const userTransactionStats = await Transaction.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$user',
                    totalTransactions:   { $sum: 1 },
                    totalPointsEarned:   { $sum: { $ifNull: ['$earnedPoints', 0] } },
                    totalPointsRedeemed: { $sum: { $ifNull: ['$spentPoints', 0] } },
                    totalSpent:          { $sum: { $ifNull: ['$finalAmount', 0] } },
                },
            },
            {
                $project: {
                    _id: 0,
                    userId:              '$_id',
                    totalTransactions:   1,
                    totalPointsEarned:   1,
                    totalPointsRedeemed: 1,
                    totalSpent:          { $round: ['$totalSpent', 3] },
                },
            },
        ]);

        const usersPerformance = allUsersList
            .map(user => {
                const stats = userTransactionStats.find(
                    s => s.userId.toString() === user._id.toString()
                ) || { totalTransactions: 0, totalPointsEarned: 0, totalPointsRedeemed: 0, totalSpent: 0 };
                return {
                    userName:            user.name || user.mobileNumber || 'Guest',
                    mobile:              user.mobileNumber || '-',
                    totalTransactions:   stats.totalTransactions,
                    pointsEarned:        stats.totalPointsEarned,
                    pointsRedeemed:      stats.totalPointsRedeemed,
                    totalSpent:          stats.totalSpent,
                };
            })
            .sort((a, b) => b.totalTransactions - a.totalTransactions);

        const escapeCSV = val => {
            if (val == null) return '';
            return `"${String(val).replace(/"/g, '""')}"`;
        };

        let csv = 'Name,Mobile,Total Transactions,Points Earned,Points Redeemed,Total Spent (BHD)\n';
        usersPerformance.forEach(u => {
            csv += [
                escapeCSV(u.userName),
                escapeCSV(u.mobile),
                u.totalTransactions,
                u.pointsEarned,
                u.pointsRedeemed,
                u.totalSpent.toFixed(3),
            ].join(',') + '\n';
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=users-performance-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    } catch (err) {
        console.error('Export Users Performance Error:', err);
        res.status(500).json({ success: false, message: 'Failed to generate report', error: err.message });
    }
};

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
                populate: { path: 'vendor', select: 'businessName businessLogo' },
            })
            .populate('items.menuItem', 'name price')
            .lean();

        if (!transaction) {
            req.flash('red', 'Order not found');
            return res.redirect('/admin/reports');
        }

        const formatDate = date => {
            const d = new Date(date);
            return d.toLocaleDateString('en-GB') + ' ' +
                d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
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
            orderId:        transaction._id,
            orderIdShort:   transaction._id.toString().slice(-8).toUpperCase(),
            date:           formatDate(transaction.createdAt),
            customerName:   transaction.user
                ? transaction.user.name || transaction.user.mobileNumber || 'Guest'
                : 'Guest',
            customerMobile: transaction.user?.mobileNumber || 'N/A',
            vendorName:     transaction.staff?.vendor?.businessName || 'Unknown Vendor',
            vendorLogo:     transaction.staff?.vendor?.businessLogo
                ? process.env.IMAGE_URL + transaction.staff.vendor.businessLogo
                : '/img/default-vendor.jpg',
            staffName:      transaction.staff?.name || 'Unknown Staff',
            items: (transaction.items || []).map(item => {
                const price    = toNumber(item.price ?? item.menuItem?.price ?? 0);
                const quantity = toNumber(item.quantity) || 1;
                return {
                    name:     item.menuItem?.name || item.itemName || 'Unknown Item',
                    quantity,
                    price:    price.toFixed(3),
                    total:    (price * quantity).toFixed(3),
                };
            }),
            subtotal:      subtotal.toFixed(3),
            pointsUsed:    toNumber(transaction.spentPoints || 0),
            discountAmount:toNumber(transaction.discountAmount || 0).toFixed(3),
            totalAmount:   toNumber(transaction.finalAmount || transaction.billAmount || subtotal || 0).toFixed(3),
            paymentStatus: (() => {
                switch (transaction.status) {
                    case 'accepted': return 'Paid';
                    case 'pending':  return 'Pending';
                    case 'rejected': return 'Rejected';
                    case 'expired':  return 'Expired';
                    default:         return 'Unknown';
                }
            })(),
        };

        res.render('reports_view', { title: `Order #${order.orderIdShort}`, order });
    } catch (error) {
        console.error('View Report Error:', error.message);
        req.flash('red', 'Invalid request or order not found');
        res.redirect('/admin/reports');
    }
};