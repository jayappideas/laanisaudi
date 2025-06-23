const router = require('express').Router();
const { upload } = require('../../controllers/uploadController');
const { checkVendor, isVendor } = require('../../controllers/api/authController');
const branchController = require('../../controllers/api/branchController');


/* ==================================================
        BRANCH API
===================================================*/

router.post('/add', isVendor, upload.none(), branchController.addBranch);
router.get('/', isVendor, upload.none(), branchController.getBranchList);
router.get('/:id', isVendor, upload.none(), branchController.getBranchDetail);
router.put('/update/:id', isVendor, upload.none(), branchController.updateBranch);
router.delete('/delete/:id', isVendor, upload.none(), branchController.deleteBranch);

/* ==================================================
        MENU CATEGORY API
===================================================*/

router.post('/category-add',  checkVendor, upload.none(), branchController.addCategory);
router.get('/category/list',  checkVendor, upload.none(), branchController.getCategoryList);
router.put('/category-update/:id',  checkVendor, upload.none(), branchController.updateCategory);
router.delete('/category-delete/:id',  checkVendor, upload.none(), branchController.deleteCategory);

/* ==================================================
        MENU ITEM API
===================================================*/

router.post('/item-add',  checkVendor, upload.single('image'), branchController.addItem);
router.get('/item/:id',  checkVendor, upload.none(), branchController.getItemList);
router.put('/item-update/:id',  checkVendor, upload.single('image'), branchController.updateItem);
router.delete('/item-delete/:id',  checkVendor, upload.none(), branchController.deleteItem);


module.exports = router;
