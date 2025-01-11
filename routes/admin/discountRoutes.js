const router = require('express').Router();

const discountController = require('../../controllers/admin/discountController');

router.get('/', discountController.getAllDiscount);
router.get('/change-status/:id/:status', discountController.approvedDiscount);


module.exports = router; 
