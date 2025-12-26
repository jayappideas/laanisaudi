const router = require('express').Router();
const fileUpload = require('express-fileupload');
const authController = require('../../controllers/admin/authController');
const userController = require('../../controllers/admin/userController');

// List all users
router.get(
    '/',
    authController.checkPermission('user', 'isView'),
    userController.getAllUsers
);

// Add User Routes
router
    .route('/add-user')
    .get(
        authController.checkPermission('user', 'isAdd'),
        userController.getAddUser
    )
    .post(
        authController.checkPermission('user', 'isAdd'),
        userController.createUser
    );

// Edit User Routes
router
    .route('/edit-user/:id')
    .get(
        authController.checkPermission('user', 'isEdit'),
        userController.getEditUser
    )
    .post(
        authController.checkPermission('user', 'isEdit'),
        userController.editUser
    );

router.get('/change-status/:id/:status', userController.changeUserStatus);

router.get('/user-delete/:id', userController.deleteAccountUser);

router.post('/notify', fileUpload(), userController.sendNotification);

router.get('/redemptions', userController.getUserRedemptions);

// View user profile (this catches /user/view/:id)
router.get('/:type/:id', userController.viewUser);

module.exports = router;
