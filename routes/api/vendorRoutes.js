const express = require('express');
const router = express.Router();
const {
getSalesAndCommissionReport,
getCustomerActivityReport,
getPointsRedemptionReport,
getPopularMenuItems,
getCustomerSegments,
} = require('../../controllers/api/vendorReportController');
const { isVendor } = require('../../controllers/api/authController');

// router.get('/reports/dashboard',isVendor, getVendorDashboard);
// router.get('/reports/points-redemption',isVendor, getVendorPointsRedemption);
// router.get('/reports/customer-activity',isVendor, getVendorCustomerActivity);
// router.get('/reports/transactions',isVendor, getVendorTransactions);
// router.get('/reports/commission',isVendor, getVendorCommission);
// router.get('/reports/export',isVendor, exportVendorReports);

router.get('/reports/points-redemption', isVendor, getPointsRedemptionReport);
router.get('/reports/customer-activity', isVendor, getCustomerActivityReport);
router.get('/reports/sales-commission', isVendor, getSalesAndCommissionReport);

router.get('/reports/popular-items', isVendor, getPopularMenuItems);
router.get('/reports/customer-segments', isVendor, getCustomerSegments);

router.get("/user-points", isVendor, getUserWisePointsSpentReport )

module.exports = router;



