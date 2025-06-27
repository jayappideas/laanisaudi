const router = require('express').Router();
const multer = require('multer');
const authController = require('../../controllers/admin/authController');

const customerController = require('../../controllers/admin/customerController');

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
    // authController.checkPermission('category', 'isView'),
    customerController.getCategories
);

router
    .route('/create-customer')
    .get(customerController.getAddCategory)
    .post(
        upload.single('image'),
        customerController.postAddCategory
    );

router
    .route('/update-customer/:id')
    .get(customerController.getEditCategory)
    .post(
        upload.single('image'),
        customerController.postEditCategory
    );

router.get('/delete-customer/:id', customerController.deleteCategory);


module.exports = router;
