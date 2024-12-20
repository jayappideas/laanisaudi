const router = require('express').Router();

const vendorController = require('../../controllers/admin/vendorController');

router.get('/', vendorController.getAllVendors);
router.get('/:id', vendorController.viewVendor);
router.get('/change-status/:id/:status', vendorController.changeVendorStatus);
router.get('/approved/:id', vendorController.approvedVendor);


module.exports = router;
