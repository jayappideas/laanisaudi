const Transaction = require('../../models/transactionModel');
const PointsHistory = require('../../models/PointsHistory');
const UserPoint = require('../../models/userPoint');
const User = require('../../models/userModel');
const Vendor = require('../../models/vendorModel');
const Staff = require('../../models/staffModel');

/**
 * Admin Revenue & Reports Dashboard
 * GET /admin/reports
 */
exports.getReportsDashboard = async (req, res) => {
    try {
        const { startDate, endDate, period = 'all', vendorId } = req.query;

        // Calculate date filter
        let dateFilter = {};
        const now = new Date();

        if (period === 'today') {
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            dateFilter = { createdAt: { $gte: today } };
        } else if (period === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFilter = { createdAt: { $gte: weekAgo } };
        } else if (period === 'month') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            dateFilter = { createdAt: { $gte: monthAgo } };
        } else if (period === 'year') {
            const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            dateFilter = { createdAt: { $gte: yearAgo } };
        } else if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate + 'T23:59:59.999Z'),
                },
            };
        }

        // Add vendor filter if specified
        let vendorFilter = {};
        if (vendorId) {
            const staff = await Staff.find({ vendor: vendorId }).select('_id');
            const staffIds = staff.map(s => s._id);
            vendorFilter = { staff: { $in: staffIds } };
        }

        const matchFilter = { ...dateFilter, ...vendorFilter, status: 'accepted' };

        // Revenue Statistics
        const revenueStats = await Transaction.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$finalAmount' },
                    totalBillAmount: { $sum: '$billAmount' },
                    totalDiscounts: { $sum: '$discountAmount' },
                    totalTransactions: { $sum: 1 },
                    totalCommission: { $sum: '$adminCommission' },
                    totalPointsEarned: { $sum: '$earnedPoints' },
                    totalPointsSpent: { $sum: '$spentPoints' },
                },
            },
        ]);

        const stats = revenueStats[0] || {
            totalRevenue: 0,
            totalBillAmount: 0,
            totalDiscounts: 0,
            totalTransactions: 0,
            totalCommission: 0,
            totalPointsEarned: 0,
            totalPointsSpent: 0,
        };

        // Revenue Trend (Monthly)
        const revenueTrend = await Transaction.aggregate([
            { $match: { ...matchFilter } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                    },
                    revenue: { $sum: '$finalAmount' },
                    commission: { $sum: '$adminCommission' },
                    transactions: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        // Top Vendors by Revenue
        const topVendors = await Transaction.aggregate([
            { $match: matchFilter },
            {
                $lookup: {
                    from: 'staffs',
                    localField: 'staff',
                    foreignField: '_id',
                    as: 'staffDetails',
                },
            },
            { $unwind: '$staffDetails' },
            {
                $group: {
                    _id: '$staffDetails.vendor',
                    totalRevenue: { $sum: '$finalAmount' },
                    totalCommission: { $sum: '$adminCommission' },
                    transactionCount: { $sum: 1 },
                },
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'vendors',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'vendorDetails',
                },
            },
            { $unwind: '$vendorDetails' },
        ]);

        // Total Active Users
        const totalUsers = await User.countDocuments({ isDelete: false });
        const totalVendors = await Vendor.countDocuments({ isDelete: false });

        res.render('admin/reports', {
            stats,
            revenueTrend,
            topVendors,
            totalUsers,
            totalVendors,
            period,
            startDate: startDate || '',
            endDate: endDate || '',
            vendorId: vendorId || '',
        });
    } catch (error) {
        console.error('Reports Dashboard Error:', error);
        req.flash('error', error.message);
        res.redirect('/admin');
    }
};

/**
 * Points Redemption Reports
 * GET /admin/reports/points-redemption
 */
exports.getPointsRedemptionReports = async (req, res) => {
    try {
        const { startDate, endDate, vendorId, page = 1, limit = 20 } = req.query;

        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate + 'T23:59:59.999Z'),
                },
            };
        }

        let vendorFilter = {};
        if (vendorId) {
            vendorFilter = { vendor: vendorId };
        }

        // Get redemption transactions
        const query = {
            ...dateFilter,
            ...vendorFilter,
            redeemBalancePoint: true,
            status: 'accepted',
            spentPoints: { $gt: 0 },
        };

        const redemptions = await Transaction.find(query)
            .populate('user', 'name email photo')
            .populate({
                path: 'staff',
                select: 'name vendor',
                populate: {
                    path: 'vendor',
                    select: 'businessName',
                },
            })
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        const count = await Transaction.countDocuments(query);

        // Redemption Statistics
        const redemptionStats = await Transaction.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalPointsRedeemed: { $sum: '$spentPoints' },
                    totalDiscountValue: { $sum: '$discountAmount' },
                    totalRedemptions: { $sum: 1 },
                },
            },
        ]);

        const stats = redemptionStats[0] || {
            totalPointsRedeemed: 0,
            totalDiscountValue: 0,
            totalRedemptions: 0,
        };

        res.render('admin/pointsRedemption', {
            redemptions,
            stats,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            startDate: startDate || '',
            endDate: endDate || '',
            vendorId: vendorId || '',
        });
    } catch (error) {
        console.error('Points Redemption Reports Error:', error);
        req.flash('error', error.message);
        res.redirect('/admin/reports');
    }
};

/**
 * Customer Activity Reports (for a specific vendor)
 * GET /admin/reports/customer-activity
 */
exports.getCustomerActivityReports = async (req, res) => {
    try {
        const { vendorId, startDate, endDate, page = 1, limit = 20 } = req.query;

        if (!vendorId) {
            req.flash('error', 'Vendor ID is required');
            return res.redirect('/admin/reports');
        }

        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate + 'T23:59:59.999Z'),
                },
            };
        }

        // Get staff for this vendor
        const staff = await Staff.find({ vendor: vendorId }).select('_id');
        const staffIds = staff.map(s => s._id);

        // Customer Activity by Vendor
        const customerActivity = await Transaction.aggregate([
            {
                $match: {
                    staff: { $in: staffIds },
                    status: 'accepted',
                    ...dateFilter,
                },
            },
            {
                $group: {
                    _id: '$user',
                    totalVisits: { $sum: 1 },
                    totalSpent: { $sum: '$finalAmount' },
                    totalPointsEarned: { $sum: '$earnedPoints' },
                    totalPointsRedeemed: { $sum: '$spentPoints' },
                    lastVisit: { $max: '$createdAt' },
                },
            },
            { $sort: { totalVisits: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: parseInt(limit) },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'customerDetails',
                },
            },
            { $unwind: '$customerDetails' },
        ]);

        const totalCount = await Transaction.aggregate([
            {
                $match: {
                    staff: { $in: staffIds },
                    status: 'accepted',
                    ...dateFilter,
                },
            },
            {
                $group: {
                    _id: '$user',
                },
            },
            {
                $count: 'total',
            },
        ]);

        const count = totalCount[0]?.total || 0;

        const vendor = await Vendor.findById(vendorId).select('businessName');

        res.render('admin/customerActivity', {
            customerActivity,
            vendor,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            vendorId,
            startDate: startDate || '',
            endDate: endDate || '',
        });
    } catch (error) {
        console.error('Customer Activity Reports Error:', error);
        req.flash('error', error.message);
        res.redirect('/admin/reports');
    }
};

/**
 * Vendor Commission Reports
 * GET /admin/reports/vendor-commission
 */
exports.getVendorCommissionReports = async (req, res) => {
    try {
        const { startDate, endDate, page = 1, limit = 20 } = req.query;

        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate + 'T23:59:59.999Z'),
                },
            };
        }

        // Vendor-wise Commission Breakdown
        const vendorCommissions = await Transaction.aggregate([
            { $match: { status: 'accepted', ...dateFilter } },
            {
                $lookup: {
                    from: 'staffs',
                    localField: 'staff',
                    foreignField: '_id',
                    as: 'staffDetails',
                },
            },
            { $unwind: '$staffDetails' },
            {
                $group: {
                    _id: '$staffDetails.vendor',
                    totalTransactions: { $sum: 1 },
                    totalRevenue: { $sum: '$finalAmount' },
                    totalCommission: { $sum: '$adminCommission' },
                    vendorEarnings: { $sum: { $subtract: ['$finalAmount', '$adminCommission'] } },
                },
            },
            { $sort: { totalRevenue: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: parseInt(limit) },
            {
                $lookup: {
                    from: 'vendors',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'vendorDetails',
                },
            },
            { $unwind: '$vendorDetails' },
        ]);

        const totalVendorsCount = await Transaction.aggregate([
            { $match: { status: 'accepted', ...dateFilter } },
            {
                $lookup: {
                    from: 'staffs',
                    localField: 'staff',
                    foreignField: '_id',
                    as: 'staffDetails',
                },
            },
            { $unwind: '$staffDetails' },
            {
                $group: {
                    _id: '$staffDetails.vendor',
                },
            },
            { $count: 'total' },
        ]);

        const count = totalVendorsCount[0]?.total || 0;

        // Overall stats
        const overallStats = await Transaction.aggregate([
            { $match: { status: 'accepted', ...dateFilter } },
            {
                $group: {
                    _id: null,
                    totalCommission: { $sum: '$adminCommission' },
                    totalRevenue: { $sum: '$finalAmount' },
                },
            },
        ]);

        const stats = overallStats[0] || { totalCommission: 0, totalRevenue: 0 };

        res.render('admin/vendorCommission', {
            vendorCommissions,
            stats,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            startDate: startDate || '',
            endDate: endDate || '',
        });
    } catch (error) {
        console.error('Vendor Commission Reports Error:', error);
        req.flash('error', error.message);
        res.redirect('/admin/reports');
    }
};

/**
 * Export Reports as CSV/JSON
 * GET /admin/reports/export
 */
exports.exportReports = async (req, res) => {
    try {
        const { type, startDate, endDate, format = 'csv', vendorId } = req.query;

        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate + 'T23:59:59.999Z'),
                },
            };
        }

        let data = [];

        if (type === 'redemptions') {
            let vendorFilter = {};
            if (vendorId) {
                const staff = await Staff.find({ vendor: vendorId }).select('_id');
                const staffIds = staff.map(s => s._id);
                vendorFilter = { staff: { $in: staffIds } };
            }

            data = await Transaction.find({
                ...dateFilter,
                ...vendorFilter,
                redeemBalancePoint: true,
                status: 'accepted',
                spentPoints: { $gt: 0 },
            })
                .populate('user', 'name email')
                .populate({
                    path: 'staff',
                    select: 'name vendor',
                    populate: {
                        path: 'vendor',
                        select: 'businessName',
                    },
                })
                .sort({ createdAt: -1 })
                .lean();
        } else if (type === 'transactions') {
            data = await Transaction.find({
                ...dateFilter,
                status: 'accepted',
            })
                .populate('user', 'name email')
                .populate({
                    path: 'staff',
                    select: 'name vendor',
                    populate: {
                        path: 'vendor',
                        select: 'businessName',
                    },
                })
                .sort({ createdAt: -1 })
                .lean();
        }

        if (format === 'csv') {
            let csv = 'Date,Time,Customer,Vendor,Bill Amount,Discount,Final Amount,Points Earned,Points Redeemed,Commission\n';

            data.forEach(item => {
                const date = new Date(item.createdAt);
                csv += `${date.toLocaleDateString()},`;
                csv += `${date.toLocaleTimeString()},`;
                csv += `${item.user?.name || 'N/A'},`;
                csv += `${item.staff?.vendor?.businessName || 'N/A'},`;
                csv += `${item.billAmount},`;
                csv += `${item.discountAmount},`;
                csv += `${item.finalAmount},`;
                csv += `${item.earnedPoints},`;
                csv += `${item.spentPoints},`;
                csv += `${item.adminCommission}\n`;
            });

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=report-${Date.now()}.csv`);
            res.send(csv);
        } else {
            res.json({
                success: true,
                data,
            });
        }
    } catch (error) {
        console.error('Export Reports Error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * API: Get Reports Dashboard Data (JSON)
 * GET /api/admin/reports/dashboard
 */
exports.getReportsDashboardAPI = async (req, res) => {
    try {
        const { startDate, endDate, period = 'month', vendorId } = req.query;

        let dateFilter = {};
        const now = new Date();

        if (period === 'today') {
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            dateFilter = { createdAt: { $gte: today } };
        } else if (period === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFilter = { createdAt: { $gte: weekAgo } };
        } else if (period === 'month') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            dateFilter = { createdAt: { $gte: monthAgo } };
        } else if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate + 'T23:59:59.999Z'),
                },
            };
        }

        let vendorFilter = {};
        if (vendorId) {
            const staff = await Staff.find({ vendor: vendorId }).select('_id');
            const staffIds = staff.map(s => s._id);
            vendorFilter = { staff: { $in: staffIds } };
        }

        const matchFilter = { ...dateFilter, ...vendorFilter, status: 'accepted' };

        const revenueStats = await Transaction.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$finalAmount' },
                    totalBillAmount: { $sum: '$billAmount' },
                    totalDiscounts: { $sum: '$discountAmount' },
                    totalTransactions: { $sum: 1 },
                    totalCommission: { $sum: '$adminCommission' },
                    totalPointsEarned: { $sum: '$earnedPoints' },
                    totalPointsSpent: { $sum: '$spentPoints' },
                },
            },
        ]);

        const stats = revenueStats[0] || {
            totalRevenue: 0,
            totalBillAmount: 0,
            totalDiscounts: 0,
            totalTransactions: 0,
            totalCommission: 0,
            totalPointsEarned: 0,
            totalPointsSpent: 0,
        };

        const revenueTrend = await Transaction.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' },
                    },
                    revenue: { $sum: '$finalAmount' },
                    commission: { $sum: '$adminCommission' },
                    transactions: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        ]);

        res.json({
            success: true,
            stats,
            revenueTrend,
        });
    } catch (error) {
        console.error('Reports API Error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
