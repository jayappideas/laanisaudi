const router = require('express').Router();
const { upload } = require('../../controllers/uploadController');
const { checkUser } = require('../../controllers/api/authController');
const homeController = require('../../controllers/api/homeController');


router.get('/categoryList', upload.none(), homeController.getCategoryList);
router.get('/banners', upload.none(), homeController.getBannerList);
router.get('/searchSuggestion', checkUser, upload.none(), homeController.getSearchSuggestion);
router.post('/restaurantList', checkUser, upload.none(), homeController.getRestaurantList);
// router.post('/restaurantDetail/:id', upload.none(), homeController.restaurantDetail);


router.post('/add', checkUser ,upload.none(), homeController.postAddReview);
router.get('/list/:vendorId', checkUser ,upload.none(), homeController.getReviews);

module.exports = router;
