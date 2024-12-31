const router = require('express').Router();
const { upload } = require('../../controllers/uploadController');
const { checkVendor } = require('../../controllers/api/authController');
const branchController = require('../../controllers/api/branchController');


router.post('/add',  checkVendor, upload.none(), branchController.addBranch);
router.get('/',  checkVendor, upload.none(), branchController.getBranchList);
router.get('/:id',  checkVendor, upload.none(), branchController.getBranchDetail);
router.put('/update/:id',  checkVendor, upload.none(), branchController.updateBranch);
router.delete('/delete/:id',  checkVendor, upload.none(), branchController.deleteBranch);

module.exports = router;
