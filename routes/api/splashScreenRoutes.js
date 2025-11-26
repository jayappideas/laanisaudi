const router = require('express').Router();
const splashScreenController = require('../../controllers/api/splashScreenController');

router.get('/', splashScreenController.getSplashScreen);

module.exports = router;
