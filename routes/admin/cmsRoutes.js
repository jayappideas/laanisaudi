const router = require('express').Router();

const cmsController = require('../../controllers/admin/cmsController');

router
    .route('/about')
    .get(cmsController.getAbout)
    .post(cmsController.postAbout);

router
    .route('/privacy')
    .get(cmsController.getPrivacy)
    .post(cmsController.postPrivacy);

router
    .route('/term')
    .get(cmsController.getTerm)
    .post(cmsController.postTerm);

router
    .route('/faq')
    .get(cmsController.getFaq)

router
    .route('/faq/add')
    .get(cmsController.getFaqAdd)
    .post(cmsController.postFaqAdd);

router
    .route('/faq/edit/:id')
    .get(cmsController.getFaqUpdate)
    .post(cmsController.postFaqUpdate);

router
    .route('/faq/delete/:id')
    .get(cmsController.getFaqDelete)
module.exports = router;
