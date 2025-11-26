const router = require('express').Router();
const vendorReportsController = require('../../controllers/api/vendorReportsController');
// Assuming you have vendor auth middleware
// const { protect } = require('../../middleware/vendorAuth');

// Vendor Dashboard Reports
router.get('/dashboard', vendorReportsController.getVendorDashboard);

// Points Redemption Reports for Vendor
router.get('/points-redemption', vendorReportsController.getPointsRedemptionReport);

// Customer Activity Reports for Vendor
router.get('/customer-activity', vendorReportsController.getCustomerActivityReport);

// Transaction List for Vendor
router.get('/transactions', vendorReportsController.getTransactionList);

// Commission Reports for Vendor
router.get('/commission', vendorReportsController.getCommissionReport);

// Export Reports for Vendor
router.get('/export', vendorReportsController.exportVendorReports);

module.exports = router;
