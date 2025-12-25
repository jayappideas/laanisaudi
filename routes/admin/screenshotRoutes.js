const router = require('express').Router();
const multer = require('multer');
const authController = require('../../controllers/admin/authController');
const screenshotController = require('../../controllers/admin/screenshotController');
const Screenshot = require('../../models/screenshotModel');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + file.originalname.replaceAll(' ', ''));
    },
});

// Initialize multer with storage engine and allow multiple files
const upload = multer({ storage: storage });

// POST - Update order of screenshots
router.post("/reorder", async (req, res) => {
  const { id, orderedIds } = req.body; // screenshot document ID + array of image _id

  try {
    const screenshotDoc = await Screenshot.findById(id);
    if (!screenshotDoc) return res.status(404).json({ success: false });

    // sort array based on user order
    screenshotDoc.screenshots.sort(
      (a, b) => orderedIds.indexOf(a._id.toString()) - orderedIds.indexOf(b._id.toString())
    );

    // update sort number
    screenshotDoc.screenshots.forEach((item, index) => item.sort = index + 1);

    await screenshotDoc.save();
    res.json({ success: true });
  } catch (err) {
    console.log("Sort update error", err);
    res.status(500).json({ success: false });
  }
});


// Main page - shows single screenshot section
router.get('/', authController.checkAdmin, screenshotController.getScreenshots);

// Create new screenshot section (only if doesn't exist)
router
    .route('/create-screenshot')
    .get(authController.checkAdmin, screenshotController.getAddScreenshot)
    .post(
        authController.checkAdmin,
        upload.array('images', 10), // Allow up to 10 images
        screenshotController.postAddScreenshot
    );

// Edit the single screenshot section
router
    .route('/edit')
    .get(authController.checkAdmin, screenshotController.getEditScreenshot)
    .post(
        authController.checkAdmin,
        upload.array('images', 10),
        screenshotController.postEditScreenshot
    );

// Toggle active status
router.get(
    '/update-status/:status',
    authController.checkAdmin,
    screenshotController.updateScreenshotStatus
);

// Delete single image from screenshot section
router.get(
    '/delete-image/:imageId',
    authController.checkAdmin,
    screenshotController.deleteScreenshotImage
);

module.exports = router;
