const router = require('express').Router();

const cmsController = require('../../controllers/api/cmsController');

router.get('/web', cmsController.screenshot);
router.get('/termCondition', cmsController.termCondition);
router.get('/privacyPolicy', cmsController.privacyPolicy);
router.get('/faq', cmsController.faq);

module.exports = router;
