const router = require('express').Router();
const { upload } = require('../../controllers/uploadController');
const staffController = require('../../controllers/api/staffController');

router.post('/login', upload.none(), staffController.login);
router.post(
    '/updateNotification/:status',
    staffController.checkStaff,
    upload.none(),
    staffController.updateNotification
);

router.get(
    '/discountList',
    staffController.checkStaff,
    upload.none(),
    staffController.getStaffDiscountList
);
router.get(
    '/discountDetail/:id',
    staffController.checkStaff,
    upload.none(),
    staffController.getDiscountDetail
);

module.exports = router;
