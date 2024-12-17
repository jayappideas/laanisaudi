const router = require('express').Router();
const multer = require('multer');

const categoryController = require('../../controllers/admin/categoryController');

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

router.get('/', categoryController.getCategories);

router
    .route('/create-category')
    .get(categoryController.getAddCategory)
    .post(
        upload.single('image'),
        categoryController.postAddCategory
    );

router
    .route('/update-category/:id')
    .get(categoryController.getEditCategory)
    .post(
        upload.single('image'),
        categoryController.postEditCategory
    );

router.get('/update-status/:id/:status', categoryController.updateCategoryStatus);


module.exports = router;
