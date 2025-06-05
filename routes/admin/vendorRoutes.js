const router = require('express').Router();
const authController = require('../../controllers/admin/authController');
const { upload } = require('../../controllers/uploadController');

const vendorController = require('../../controllers/admin/vendorController');

router.get(
    '/',
    authController.checkPermission('vendor', 'isView'),
    vendorController.getAllVendors
);
router.get('/view/:id', vendorController.viewVendor);
router.get('/change-status/:id/:status', vendorController.changeVendorStatus);
router.get('/approved/:id', vendorController.approvedVendor);

router
    .route('/add-vendor')
    .get(vendorController.getAddVendor)
    .post(
        upload.fields([
            { name: 'businessLogo', maxCount: 1 },
            { name: 'businessLicense', maxCount: 1 },
        ]),
        vendorController.createVendor
    );

router
    .route('/edit-vendor/:id')
    .get(vendorController.getEditVendor)
    .post(
        upload.fields([
            { name: 'businessLogo', maxCount: 1 },
            { name: 'businessLicense', maxCount: 1 },
        ]),
        vendorController.editVendor
    );
router.post('/notify', vendorController.sendNotification);

module.exports = router;
