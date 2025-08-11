const router = require('express').Router();
const { upload } = require('../../controllers/uploadController');
const { checkUser } = require('../../controllers/api/authController');
const transactionController = require('../../controllers/api/transactionController');

// router.get('/history', checkUser, transactionController.getTransactionHistory);
router.get('/history-user',checkUser, transactionController.getPointsHistory);

module.exports = router;
