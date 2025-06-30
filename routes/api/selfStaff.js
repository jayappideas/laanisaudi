const router = require('express').Router();
const { upload } = require('../../controllers/uploadController');
const staffController = require('../../controllers/api/staffController');
const selfStaff = require('../../controllers/api/selfStaff');

router.post('/sendOtp', upload.none(), selfStaff.sendOtpVendor);
router.post('/verifyOtp', upload.none(), selfStaff.verifyOtpVendor);
router.post('/resendOtp', upload.none(), selfStaff.resendOtpVendor);

router.post('/add', upload.fields([{ name: 'image', maxCount: 1 }]), selfStaff.addStaff);
router.put(
    '/update',
    upload.fields([{ name: 'image', maxCount: 1 }]),
    selfStaff.updateStaff
);
router.get(
    '/vendorList',
    selfStaff.getAllVendors
);
router.post(
    '/branchList',
    upload.none(),
    selfStaff.getBranchList
);
router.post('/login', upload.none(), staffController.login);
router.post(
    '/forgotPassword',
    upload.none(),
    staffController.forgotPasswordVendor
);
router.post(
    '/resetPassword',
    upload.none(),
    staffController.resetPasswordVendor
);
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
router.get(
    '/staffDetails',
    staffController.checkStaff,
    upload.none(),
    selfStaff.getStaffDetail
);
router.put(
    '/update/staffDetails',
    staffController.checkStaff,
    upload.none(),
    selfStaff.updateStaff
);
module.exports = router;
