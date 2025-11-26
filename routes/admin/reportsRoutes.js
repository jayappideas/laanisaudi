const router = require('express').Router();
const reportsController = require('../../controllers/admin/reportsController');
// Assuming you have admin auth middleware
// const { protect } = require('../../middleware/adminAuth');

// Admin Reports Dashboard
router.get('/', reportsController.getReportsDashboard);

// Points Redemption Reports
router.get('/points-redemption', reportsController.getPointsRedemptionReports);

// Customer Activity Reports
router.get('/customer-activity', reportsController.getCustomerActivityReports);

// Vendor Commission Reports
router.get('/vendor-commission', reportsController.getVendorCommissionReports);

// Export Reports
router.get('/export', reportsController.exportReports);

// API Endpoint for Dashboard Data (JSON)
router.get('/api/dashboard', reportsController.getReportsDashboardAPI);

module.exports = router;
