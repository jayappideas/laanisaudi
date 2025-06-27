const router = require('express').Router();
const { upload } = require('../../controllers/uploadController');
const { checkVendor } = require('../../controllers/api/authController');
const discountController = require('../../controllers/api/discountController');

// ! API FOR VENDOR ONLY
router.get('/customer-type', checkVendor, upload.none(), discountController.getCategories);
router.post('/add',  checkVendor, upload.none(), discountController.addDiscount);
router.get('/',  checkVendor, upload.none(), discountController.getDiscountList);
router.get('/:id',  checkVendor, upload.none(), discountController.getDiscountDetail);
router.put('/:id',  checkVendor, upload.none(), discountController.updateDiscount);
router.delete('/:id',  checkVendor, upload.none(), discountController.deleteDiscount);

module.exports = router;
