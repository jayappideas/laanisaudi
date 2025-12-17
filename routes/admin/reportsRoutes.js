const express = require('express');
const router = express.Router();
const {
  getUserAnalytics,
  getPointRedemptionAnalytics,  
  getVendorPerformance,
  getRedemptionTrends,
  renderReports,
  viewReport
} = require('../../controllers/admin/adminReportController');

const { checkAdmin } = require('../../controllers/admin/authController');

router.get('/users-analytics', checkAdmin, getUserAnalytics);
router.get('/point-redemptions', checkAdmin, getPointRedemptionAnalytics);
router.get('/vendor-performance', checkAdmin, getVendorPerformance);
router.get('/redemption-trends', checkAdmin, getRedemptionTrends); 

// router.get('/', checkAdmin, (req, res) => {
//   res.render('reports', {     
//     url: '/admin/reports',
//     pageTitle: 'Reports & Analytics'
//   });
// });

router.get('/', checkAdmin , renderReports)

router.get("/view/:id",checkAdmin,viewReport)

module.exports = router;