const router = require('express').Router();
const { upload } = require('../../controllers/uploadController');
const staffController = require('../../controllers/api/staffController');
const selfStaff = require('../../controllers/api/selfStaff');


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
router.delete(
    '/delete-staff',
    staffController.checkStaff,
    staffController.deleteStaffByStaff
);
router.get('/:id', staffController.checkStaff, upload.none(), selfStaff.getStaffDetail);
router.put(
    '/update/:id',
    staffController.checkStaff,
    upload.none(),
    selfStaff.updateStaff
);
module.exports = router;
