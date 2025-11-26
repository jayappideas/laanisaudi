const Transaction = require('../../models/transactionModel');
const PointsHistory = require('../../models/PointsHistory');
const UserPoint = require('../../models/userPoint');
const User = require('../../models/userModel');
const Staff = require('../../models/staffModel');
const Vendor = require('../../models/vendorModel');

/**
 * Get Vendor Dashboard Reports
 * GET /api/vendor/reports/dashboard
 */
exports.getVendorDashboard = async (req, res) => {
    try {
        const vendorId = req.vendor._id; // Assuming auth middleware sets req.vendor
        const { startDate, endDate, period = 'month' } = req.query;

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

        // Get all staff for this vendor
        const staff = await Staff.find({ vendor: vendorId }).select('_id');
        const staffIds = staff.map(s => s._id);

        const matchFilter = {
            staff: { $in: staffIds },
            status: 'accepted',
            ...dateFilter
        };

        // Revenue Statistics
        const revenueStats = await Transaction.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: null,
                    totalTransactions: { $sum: 1 },
                    totalBillAmount: { $sum: '$billAmount' },
                    totalDiscounts: { $sum: '$discountAmount' },
                    totalRevenue: { $sum: '$finalAmount' },
                    totalCommissionPaid: { $sum: '$adminCommission' },
                    totalPointsGiven: { $sum: '$earnedPoints' },
                    totalPointsRedeemed: { $sum: '$spentPoints' },
                    netEarnings: {
                        $sum: { $subtract: ['$finalAmount', '$adminCommission'] }
                    },
                },
            },
        ]);

        const stats = revenueStats[0] || {
            totalTransactions: 0,
            totalBillAmount: 0,
            totalDiscounts: 0,
            totalRevenue: 0,
            totalCommissionPaid: 0,
            totalPointsGiven: 0,
            totalPointsRedeemed: 0,
            netEarnings: 0,
        };

        // Revenue trend by day
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
                    transactions: { $sum: 1 },
                    commission: { $sum: '$adminCommission' },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        ]);

        // Top customers
        const topCustomers = await Transaction.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: '$user',
                    totalSpent: { $sum: '$finalAmount' },
                    totalVisits: { $sum: 1 },
                    pointsEarned: { $sum: '$earnedPoints' },
                    pointsRedeemed: { $sum: '$spentPoints' },
                },
            },
            { $sort: { totalSpent: -1 } },
            { $limit: 10 },
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

        res.json({
            success: true,
            stats,
            revenueTrend,
            topCustomers,
        });
    } catch (error) {
        console.error('Vendor Dashboard Error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Get Points Redemption Report for Vendor
 * GET /api/vendor/reports/points-redemption
 */
exports.getPointsRedemptionReport = async (req, res) => {
    try {
        const vendorId = req.vendor._id;
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

        // Get staff for this vendor
        const staff = await Staff.find({ vendor: vendorId }).select('_id');
        const staffIds = staff.map(s => s._id);

        const query = {
            staff: { $in: staffIds },
            redeemBalancePoint: true,
            status: 'accepted',
            spentPoints: { $gt: 0 },
            ...dateFilter,
        };

        const redemptions = await Transaction.find(query)
            .populate('user', 'name email photo')
            .populate('staff', 'name')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .select('createdAt spentPoints discountAmount billAmount finalAmount user staff')
            .lean();

        const count = await Transaction.countDocuments(query);

        // Stats
        const redemptionStats = await Transaction.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalPointsRedeemed: { $sum: '$spentPoints' },
                    totalDiscountGiven: { $sum: '$discountAmount' },
                    totalRedemptions: { $sum: 1 },
                },
            },
        ]);

        const stats = redemptionStats[0] || {
            totalPointsRedeemed: 0,
            totalDiscountGiven: 0,
            totalRedemptions: 0,
        };

        res.json({
            success: true,
            redemptions,
            stats,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit),
                limit: parseInt(limit),
            },
        });
    } catch (error) {
        console.error('Points Redemption Report Error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Get Customer Activity Report for Vendor
 * GET /api/vendor/reports/customer-activity
 */
exports.getCustomerActivityReport = async (req, res) => {
    try {
        const vendorId = req.vendor._id;
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

        // Get staff for this vendor
        const staff = await Staff.find({ vendor: vendorId }).select('_id');
        const staffIds = staff.map(s => s._id);

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
                    firstVisit: { $min: '$createdAt' },
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
            {
                $project: {
                    _id: 1,
                    totalVisits: 1,
                    totalSpent: 1,
                    totalPointsEarned: 1,
                    totalPointsRedeemed: 1,
                    lastVisit: 1,
                    firstVisit: 1,
                    customer: {
                        _id: '$customerDetails._id',
                        name: '$customerDetails.name',
                        email: '$customerDetails.email',
                        photo: '$customerDetails.photo',
                    },
                },
            },
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
            { $count: 'total' },
        ]);

        const count = totalCount[0]?.total || 0;

        res.json({
            success: true,
            customerActivity,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit),
                limit: parseInt(limit),
            },
        });
    } catch (error) {
        console.error('Customer Activity Report Error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Get Transaction List for Vendor (with filters)
 * GET /api/vendor/reports/transactions
 */
exports.getTransactionList = async (req, res) => {
    try {
        const vendorId = req.vendor._id;
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

        // Get staff for this vendor
        const staff = await Staff.find({ vendor: vendorId }).select('_id');
        const staffIds = staff.map(s => s._id);

        const query = {
            staff: { $in: staffIds },
            status: 'accepted',
            ...dateFilter,
        };

        const transactions = await Transaction.find(query)
            .populate('user', 'name email photo')
            .populate('staff', 'name')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        const count = await Transaction.countDocuments(query);

        // Calculate summary
        const summary = await Transaction.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$finalAmount' },
                    totalCommission: { $sum: '$adminCommission' },
                    netEarnings: {
                        $sum: { $subtract: ['$finalAmount', '$adminCommission'] }
                    },
                },
            },
        ]);

        res.json({
            success: true,
            transactions,
            summary: summary[0] || { totalAmount: 0, totalCommission: 0, netEarnings: 0 },
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit),
                limit: parseInt(limit),
            },
        });
    } catch (error) {
        console.error('Transaction List Error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Get Commission Report for Vendor
 * GET /api/vendor/reports/commission
 */
exports.getCommissionReport = async (req, res) => {
    try {
        const vendorId = req.vendor._id;
        const { startDate, endDate } = req.query;

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

        // Commission breakdown
        const commissionStats = await Transaction.aggregate([
            {
                $match: {
                    staff: { $in: staffIds },
                    status: 'accepted',
                    ...dateFilter,
                },
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$finalAmount' },
                    totalCommission: { $sum: '$adminCommission' },
                    netEarnings: {
                        $sum: { $subtract: ['$finalAmount', '$adminCommission'] }
                    },
                    transactionCount: { $sum: 1 },
                },
            },
        ]);

        const stats = commissionStats[0] || {
            totalRevenue: 0,
            totalCommission: 0,
            netEarnings: 0,
            transactionCount: 0,
        };

        // Commission by time period (daily/monthly)
        const commissionTrend = await Transaction.aggregate([
            {
                $match: {
                    staff: { $in: staffIds },
                    status: 'accepted',
                    ...dateFilter,
                },
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' },
                    },
                    revenue: { $sum: '$finalAmount' },
                    commission: { $sum: '$adminCommission' },
                    netEarnings: {
                        $sum: { $subtract: ['$finalAmount', '$adminCommission'] }
                    },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        ]);

        // Get vendor commission percentage
        const vendor = await Vendor.findById(vendorId).select('adminCommission');
        const commissionPercentage = vendor?.adminCommission || 0;

        res.json({
            success: true,
            stats,
            commissionPercentage,
            commissionTrend,
        });
    } catch (error) {
        console.error('Commission Report Error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Export Vendor Reports
 * GET /api/vendor/reports/export
 */
exports.exportVendorReports = async (req, res) => {
    try {
        const vendorId = req.vendor._id;
        const { type, startDate, endDate, format = 'csv' } = req.query;

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

        let data = [];

        if (type === 'transactions') {
            data = await Transaction.find({
                staff: { $in: staffIds },
                status: 'accepted',
                ...dateFilter,
            })
                .populate('user', 'name email')
                .populate('staff', 'name')
                .sort({ createdAt: -1 })
                .lean();
        } else if (type === 'redemptions') {
            data = await Transaction.find({
                staff: { $in: staffIds },
                redeemBalancePoint: true,
                status: 'accepted',
                spentPoints: { $gt: 0 },
                ...dateFilter,
            })
                .populate('user', 'name email')
                .populate('staff', 'name')
                .sort({ createdAt: -1 })
                .lean();
        }

        if (format === 'csv') {
            let csv = 'Date,Time,Customer,Staff,Bill Amount,Discount,Final Amount,Points Earned,Points Redeemed,Commission\n';

            data.forEach(item => {
                const date = new Date(item.createdAt);
                csv += `${date.toLocaleDateString()},`;
                csv += `${date.toLocaleTimeString()},`;
                csv += `${item.user?.name || 'N/A'},`;
                csv += `${item.staff?.name || 'N/A'},`;
                csv += `${item.billAmount},`;
                csv += `${item.discountAmount},`;
                csv += `${item.finalAmount},`;
                csv += `${item.earnedPoints},`;
                csv += `${item.spentPoints},`;
                csv += `${item.adminCommission}\n`;
            });

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=vendor-report-${Date.now()}.csv`);
            res.send(csv);
        } else {
            res.json({
                success: true,
                data,
            });
        }
    } catch (error) {
        console.error('Export Vendor Reports Error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
