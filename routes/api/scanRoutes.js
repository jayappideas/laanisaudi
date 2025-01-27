const router = require('express').Router();
const { upload } = require('../../controllers/uploadController');
const { checkUser } = require('../../controllers/api/authController');
const scanController = require('../../controllers/api/scanController');
const { checkStaff } = require('../../controllers/api/staffController');


router.post('/scanQr', checkStaff , upload.none(), scanController.scanQr);
router.get('/menuList', checkStaff , upload.none(), scanController.getMenuList);
router.post('/calculateDiscount', checkStaff , upload.none(), scanController.calculateDiscount);


module.exports = router;
