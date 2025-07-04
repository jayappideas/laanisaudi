const router = require('express').Router();
const authController = require('../../controllers/admin/authController');
const { upload } = require('../../controllers/uploadController');

const vendorController = require('../../controllers/admin/vendorController');
const fileUpload = require('express-fileupload');

router.get(
    '/',
    authController.checkPermission('vendor', 'isView'),
    vendorController.getAllVendors
);
router.get('/view/:id', vendorController.viewVendor);
router.get('/change-status/:id/:status', vendorController.changeVendorStatus);
router.get('/approved/:id', vendorController.approvedVendor);
router.get('/disapproved/:id', vendorController.disapprovedVendor);
router.get('/delete/:id', vendorController.deleteAccountVendor);
router.get('/logs/:id', vendorController.vendorlogs);

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
router.post('/notify', fileUpload(), vendorController.sendNotification);


module.exports = router;
