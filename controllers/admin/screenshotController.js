const Screenshot = require('../../models/screenshotModel');
const fs = require('fs');
const path = require('path');

exports.getScreenshots = async (req, res) => {
    try {
        // Get the single screenshot document or create if doesn't exist
        let screenshot = await Screenshot.findOne();

        if (!screenshot) {
            screenshot = await Screenshot.create({
                mainPage: {
                    en: { title: '', description: '' },
                    ar: { title: '', description: '' },
                },
                featuresPage: {
                    en: { title: '', description: '', features: [] },
                    ar: { title: '', description: '', features: [] },
                },
                screenshots: [],
                isActive: true,
            });
        }

        res.render('screenshot', { screenshot });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin');
    }
};

exports.getAddScreenshot = async (req, res) => {
    try {
        // Check if screenshot already exists
        const existingScreenshot = await Screenshot.findOne();

        if (existingScreenshot) {
            req.flash(
                'red',
                'Screenshot section already exists. Please edit the existing one.'
            );
            return res.redirect('/admin/screenshot');
        }

        res.render('screenshot_add');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/screenshot');
    }
};

exports.postAddScreenshot = async (req, res) => {
    try {
        // Check if screenshot already exists
        const existingScreenshot = await Screenshot.findOne();

        if (existingScreenshot) {
            req.flash(
                'red',
                'Screenshot section already exists. Please edit the existing one.'
            );
            return res.redirect('/admin/screenshot');
        }

        const {
            mainTitleEn,
            mainDescriptionEn,
            mainTitleAr,
            mainDescriptionAr,
            featuresTitleEn,
            featureDescriptionEn,
            featuresTitleAr,
            featureDescriptionAr,
        } = req.body;

        // Process uploaded images
        const screenshots = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach((file, index) => {
                screenshots.push({
                    image: file.filename,
                    sort: index + 1,
                });
            });
        }

        // Build features arrays from form inputs (allow up to 6 items)
        const featuresEnTitles = Array.isArray(req.body.featuresEnTitle)
            ? req.body.featuresEnTitle
            : req.body.featuresEnTitle
            ? [req.body.featuresEnTitle]
            : [];
        const featuresEnDescriptions = Array.isArray(
            req.body.featuresEnDescription
        )
            ? req.body.featuresEnDescription
            : req.body.featuresEnDescription
            ? [req.body.featuresEnDescription]
            : [];
        const featuresArTitles = Array.isArray(req.body.featuresArTitle)
            ? req.body.featuresArTitle
            : req.body.featuresArTitle
            ? [req.body.featuresArTitle]
            : [];
        const featuresArDescriptions = Array.isArray(
            req.body.featuresArDescription
        )
            ? req.body.featuresArDescription
            : req.body.featuresArDescription
            ? [req.body.featuresArDescription]
            : [];

        const featuresEn = featuresEnTitles
            .map((t, i) => ({
                title: (t || '').trim(),
                description: (featuresEnDescriptions[i] || '').trim(),
            }))
            .filter(f => f.title)
            .slice(0, 6);

        const featuresAr = featuresArTitles
            .map((t, i) => ({
                title: (t || '').trim(),
                description: (featuresArDescriptions[i] || '').trim(),
            }))
            .filter(f => f.title)
            .slice(0, 6);

        await Screenshot.create({
            mainPage: {
                en: {
                    title: mainTitleEn,
                    description: mainDescriptionEn,
                },
                ar: {
                    title: mainTitleAr,
                    description: mainDescriptionAr,
                },
            },
            featuresPage: {
                en: {
                    title: featuresTitleEn,
                    description: featureDescriptionEn,
                    features: featuresEn,
                },
                ar: {
                    title: featuresTitleAr,
                    description: featureDescriptionAr,
                    features: featuresAr,
                },
            },
            screenshots: screenshots,
        });

        req.flash('green', 'Screenshot section created successfully.');
        res.redirect('/admin/screenshot');
    } catch (error) {
        console.error('Add Screenshot Error:', error);
        req.flash('red', error.message);
        res.redirect('/admin/screenshot');
    }
};

exports.getEditScreenshot = async (req, res) => {
    try {
        // Get the single screenshot document
        const screenshot = await Screenshot.findOne();

        if (!screenshot) {
            req.flash('red', 'Screenshot section not found!');
            return res.redirect('/admin/screenshot');
        }

        res.render('screenshot_edit', { screenshot });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/screenshot');
    }
};

exports.postEditScreenshot = async (req, res) => {
    try {
        // Get the single screenshot document
        const screenshot = await Screenshot.findOne();

        if (!screenshot) {
            req.flash('red', 'Screenshot section not found!');
            return res.redirect('/admin/screenshot');
        }

        const {
            mainTitleEn,
            mainDescriptionEn,
            mainTitleAr,
            mainDescriptionAr,
            featuresTitleEn,
            featureDescriptionEn,
            featuresTitleAr,
            featureDescriptionAr,
        } = req.body;

        // Update main page and features page content
        screenshot.mainPage.en.title = mainTitleEn;
        screenshot.mainPage.en.description = mainDescriptionEn;
        screenshot.mainPage.ar.title = mainTitleAr;
        screenshot.mainPage.ar.description = mainDescriptionAr;

        screenshot.featuresPage.en.title = featuresTitleEn;
        screenshot.featuresPage.en.description = featureDescriptionEn;
        screenshot.featuresPage.ar.title = featuresTitleAr;
        screenshot.featuresPage.ar.description = featureDescriptionAr;

        // Build features arrays for en/ar (up to 6)
        const featuresEnTitles = Array.isArray(req.body.featuresEnTitle)
            ? req.body.featuresEnTitle
            : req.body.featuresEnTitle
            ? [req.body.featuresEnTitle]
            : [];
        const featuresEnDescriptions = Array.isArray(
            req.body.featuresEnDescription
        )
            ? req.body.featuresEnDescription
            : req.body.featuresEnDescription
            ? [req.body.featuresEnDescription]
            : [];
        const featuresArTitles = Array.isArray(req.body.featuresArTitle)
            ? req.body.featuresArTitle
            : req.body.featuresArTitle
            ? [req.body.featuresArTitle]
            : [];
        const featuresArDescriptions = Array.isArray(
            req.body.featuresArDescription
        )
            ? req.body.featuresArDescription
            : req.body.featuresArDescription
            ? [req.body.featuresArDescription]
            : [];

        screenshot.featuresPage.en.features = featuresEnTitles
            .map((t, i) => ({
                title: (t || '').trim(),
                description: (featuresEnDescriptions[i] || '').trim(),
            }))
            .filter(f => f.title)
            .slice(0, 6);

        screenshot.featuresPage.ar.features = featuresArTitles
            .map((t, i) => ({
                title: (t || '').trim(),
                description: (featuresArDescriptions[i] || '').trim(),
            }))
            .filter(f => f.title)
            .slice(0, 6);

        // Handle new image uploads
        if (req.files && req.files.length > 0) {
            // Delete old images
            screenshot.screenshots.forEach(img => {
                const oldImagePath = path.join(
                    __dirname,
                    '../../public/uploads/',
                    img.image
                );
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            });

            // Add new images
            const newScreenshots = [];
            req.files.forEach((file, index) => {
                newScreenshots.push({
                    image: file.filename,
                    sort: index + 1,
                });
            });
            screenshot.screenshots = newScreenshots;
        }

        await screenshot.save();

        req.flash('green', 'Data updated successfully.');
        res.redirect('/admin/screenshot');
    } catch (error) {
        console.error('Edit Screenshot Error:', error);
        req.flash('red', error.message);
        res.redirect('/admin/screenshot');
    }
};

exports.updateScreenshotStatus = async (req, res) => {
    try {
        const screenshot = await Screenshot.findOne();

        if (!screenshot) {
            req.flash('red', 'Screenshot section not found!');
            return res.redirect('/admin/screenshot');
        }

        screenshot.isActive = req.params.status === '1';

        await screenshot.save();

        req.flash('green', 'Screenshot status updated successfully.');
        res.redirect('/admin/screenshot');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/screenshot');
    }
};

exports.deleteScreenshotImage = async (req, res) => {
    try {
        const { imageId } = req.params;

        const screenshot = await Screenshot.findOne();

        if (!screenshot) {
            req.flash('red', 'Screenshot section not found!');
            return res.redirect('/admin/screenshot');
        }

        const imageIndex = screenshot.screenshots.findIndex(
            img => img._id.toString() === imageId
        );

        if (imageIndex === -1) {
            req.flash('red', 'Image not found!');
            return res.redirect('/admin/screenshot/edit');
        }

        // Delete the image file
        const imagePath = path.join(
            __dirname,
            '../../public/uploads/',
            screenshot.screenshots[imageIndex].image
        );
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        // Remove from array
        screenshot.screenshots.splice(imageIndex, 1);
        await screenshot.save();

        req.flash('green', 'Image deleted successfully.');
        res.redirect('/admin/screenshot/edit');
    } catch (error) {
        console.error('Delete Image Error:', error);
        req.flash('red', error.message);
        res.redirect('/admin/screenshot');
    }
};
