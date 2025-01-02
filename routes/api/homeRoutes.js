const router = require('express').Router();
const { upload } = require('../../controllers/uploadController');
const { checkUser } = require('../../controllers/api/authController');
const homeController = require('../../controllers/api/homeController');


router.get('/categoryList', upload.none(), homeController.getCategoryList);
router.get('/banners', upload.none(), homeController.getBannerList);
router.get('/searchSuggestion', upload.none(), homeController.getSearchSuggestion);
router.post('/restaurantList', upload.none(), homeController.getRestaurantList);
// router.post('/restaurantDetail/:id', upload.none(), homeController.restaurantDetail);



module.exports = router;
