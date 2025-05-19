const router = require('express').Router();
const { upload } = require('../../controllers/uploadController');
const { checkVendor } = require('../../controllers/api/authController');
const staffController = require('../../controllers/api/staffController');

router.post('/add', checkVendor, upload.none(), staffController.addStaff);
router.get('/', checkVendor, upload.none(), staffController.getStaffList);
router.get('/:id', checkVendor, upload.none(), staffController.getStaffDetail);
router.put(
    '/update/:id',
    checkVendor,
    upload.none(),
    staffController.updateStaff
);

router.delete(
    '/delete/:id',
    checkVendor,
    upload.none(),
    staffController.deleteStaff
);

module.exports = router;
