const router = require('express').Router();
const { upload } = require('../../controllers/uploadController');
const { checkUser } = require('../../controllers/api/authController');
const authController = require('../../controllers/api/authController');

router.post('/sendOtp', upload.none(), authController.sendOtp);
router.post('/verifyOtp', upload.none(), authController.verifyOtp);
router.post('/resendOtp', upload.none(), authController.resendOtp);

router.post('/signup', upload.none(), authController.signUp);

router.post('/login', upload.none(), authController.login);
router.post('/checkLoginPasscode', upload.none(), authController.checkLoginPasscode);

router.post('/forgotPasscode', upload.none(), authController.forgotPasscode);

router.post('/resetPasscode', upload.none(), authController.resetPasscode);

router.post('/checkCurrentPasscode', upload.none(), checkUser, authController.checkCurrentPasscode);
router.post('/changePasscode', upload.none(), checkUser, authController.changePasscode);

router.put('/editProfile', checkUser, upload.single('photo'), authController.editProfile);

module.exports = router;
