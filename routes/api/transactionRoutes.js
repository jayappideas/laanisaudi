const router = require('express').Router();
const { upload } = require('../../controllers/uploadController');
const {
    checkUser,
} = require('../../controllers/api/authController');
const transactionController = require('../../controllers/api/transactionController');
const { checkStaff } = require('../../controllers/api/staffController');

// router.get('/history', checkUser, transactionController.getTransactionHistory);
router.get('/history-user',checkUser, transactionController.getPointsHistory);
router.get('/history-staff', checkStaff, transactionController.getPointsHistoryS);

module.exports = router;
