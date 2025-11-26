const router = require('express').Router();
const multer = require('multer');
const authController = require('../../controllers/admin/authController');
const splashScreenController = require('../../controllers/admin/splashScreenController');

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
    authController.checkPermission('intro_screen', 'isView'),
    splashScreenController.getSplashScreen
);

router.post(
    '/update',
    authController.checkPermission('intro_screen', 'isEdit'),
    upload.fields([
        { name: 'video1', maxCount: 1 },
        { name: 'video2', maxCount: 1 },
        { name: 'video3', maxCount: 1 }
    ]),
    splashScreenController.postUpdateSplashScreen
);

router.get(
    '/delete-video/:videoSlot',
    authController.checkPermission('intro_screen', 'isDelete'),
    splashScreenController.deleteVideo
);

module.exports = router;
