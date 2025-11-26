const router = require('express').Router();
const multer = require('multer');
const authController = require('../../controllers/admin/authController');

const introScreenController = require('../../controllers/admin/introScreenController');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + file.originalname.replaceAll(' ', ''));
    },
});
// Initialize multer with storage engine
const upload = multer({ storage: storage });

router.get(
    '/',
    // authController.checkPermission('intro_screen', 'isView'),
    introScreenController.getIntroScreens
);

router
    .route('/create-intro-screen')
    .get(introScreenController.getAddIntroScreen)
    .post(
        upload.fields([{ name: 'image', maxCount: 1 }]),
        introScreenController.postAddIntroScreen
    );

router
    .route('/update-intro-screen/:id')
    .get(introScreenController.getEditIntroScreen)
    .post(
        upload.fields([{ name: 'image', maxCount: 1 }]),
        introScreenController.postEditIntroScreen
    );

router.get('/delete/:id', introScreenController.getDeleteIntroScreen);

module.exports = router;
