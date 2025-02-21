const router = require('express').Router();
const { upload } = require('../../controllers/uploadController');
const { checkUser } = require('../../controllers/api/authController');
const scanController = require('../../controllers/api/scanController');
const { checkStaff } = require('../../controllers/api/staffController');

router.post('/scanQr', checkStaff, upload.none(), scanController.scanQr);
router.get('/menuList', checkStaff, upload.none(), scanController.getMenuList);
router.post(
    '/calculateDiscount',
    checkStaff,
    upload.none(),
    scanController.calculateDiscount
);

router.get('/cart/:userId', checkStaff, scanController.getCart);
router.post('/cart/add', checkStaff, upload.none(), scanController.addCart);
router.post(
    '/cart/decrease',
    checkStaff,
    upload.none(),
    scanController.decreaseCart
);
router.get(
    '/apply-discount/:discountId/:userId',
    checkStaff,
    scanController.checkDiscount
);
router.get('/checkout/:userId', checkStaff, scanController.checkout);

module.exports = router;
