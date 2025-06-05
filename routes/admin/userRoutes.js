const router = require('express').Router();
const fileUpload = require('express-fileupload');
const authController = require('../../controllers/admin/authController');

const userController = require('../../controllers/admin/userController');

router.get(
    '/',
    authController.checkPermission('user', 'isView'),
    userController.getAllUsers
);
router.get('/:type/:id', userController.viewUser);
router.get('/change-status/:id/:status', userController.changeUserStatus);

router.post('/notify',fileUpload(), userController.sendNotification);

module.exports = router;
