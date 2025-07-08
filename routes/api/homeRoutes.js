const router = require('express').Router();
const { upload } = require('../../controllers/uploadController');
const { checkUser,isUser } = require('../../controllers/api/authController');
const homeController = require('../../controllers/api/homeController');
const staffController = require('../../controllers/api/staffController');

router.get(
    '/dashboard',
    staffController.checkStaff,
    homeController.dashboardStaff
);
router.get('/categoryList', upload.none(), homeController.getCategoryList);
router.get('/categoryListVendor', upload.none(), homeController.getCategoryListVendor);
router.get('/banners', upload.none(), homeController.getBannerList);
router.get('/searchSuggestion', isUser, upload.none(), homeController.getSearchSuggestion);
router.post('/restaurantList', isUser, upload.none(), homeController.getRestaurantList);
router.post('/restaurantDetail', checkUser, upload.none(), homeController.restaurantDetail);

router.post('/addFavourite/:vendorId', checkUser ,upload.none(), homeController.postAddFavourite);
router.get('/favouriteList', checkUser ,upload.none(), homeController.getFavouriteList);

router.post('/add', checkUser ,upload.none(), homeController.postAddReview);
router.get('/list/:vendorId', checkUser ,upload.none(), homeController.getReviews);

module.exports = router;
