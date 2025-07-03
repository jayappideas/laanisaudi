const router = require('express').Router();
const { upload } = require('../../controllers/uploadController');
const { checkUser } = require('../../controllers/api/authController');
const scanController = require('../../controllers/api/scanController');
const { checkStaff } = require('../../controllers/api/staffController');

router.post('/scanQr', checkStaff, upload.none(), scanController.scanQr);
router.post('/menuList', checkStaff, upload.none(), scanController.getMenuList);
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
router.post(
    '/apply-discount',
    checkStaff,
    upload.none(),
    scanController.checkDiscount
);
router.post('/checkout', upload.none(), checkStaff, scanController.checkout);
router.get(
    '/current-transaction',
    checkUser,
    scanController.getCurrentTransaction
);
router.post(
    '/update-order-status',
    upload.none(),
    checkUser,
    scanController.updateOrderStatus
);
router.post(
    '/current-transaction-staff',
    upload.none(),
    checkStaff,
    scanController.getCurrentTransactionStaff
);
module.exports = router;
