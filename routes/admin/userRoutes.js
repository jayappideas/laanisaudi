const router = require('express').Router();

const userController = require('../../controllers/admin/userController');

router.get('/:type', userController.getAllUsers);


router.get('/:type/:id', userController.viewUser);

router.get('/change-status/:id/:status', userController.changeUserStatus);


module.exports = router;
