const router = require('express').Router();

const introScreenController = require('../../controllers/api/introScreenController');

router.get('/', introScreenController.getIntroScreens);

module.exports = router;
