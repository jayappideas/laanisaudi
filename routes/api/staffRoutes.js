const router = require('express').Router();
const { upload } = require('../../controllers/uploadController');
const { checkVendor } = require('../../controllers/api/authController');
const staffController = require('../../controllers/api/staffController');

router.post('/add', checkVendor, upload.fields([{ name: 'image', maxCount: 1 }]),  staffController.addStaff);
router.get('/', checkVendor, upload.none(), staffController.getStaffList);
router.get('/:id', checkVendor, upload.none(), staffController.getStaffDetail);
router.put(
    '/update/:id',
    checkVendor,
    upload.fields([{ name: 'image', maxCount: 1 }]),
    staffController.updateStaff
);
router.post('/status/:id', checkVendor, upload.none(), staffController.changeStaffStatus);
router.delete(
    '/delete/:id',
    checkVendor,
    upload.none(),
    staffController.deleteStaff
);

module.exports = router;
