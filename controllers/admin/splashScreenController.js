const splashScreenModel = require('../../models/splashScreenModel');
const fs = require('fs');
const path = require('path');

exports.getSplashScreen = async (req, res) => {
    try {
        let splashScreen = await splashScreenModel.findOne();

        // Create a default splash screen entry if none exists
        if (!splashScreen) {
            splashScreen = await splashScreenModel.create({});
        }

        res.render('splash_screen', { splashScreen });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin');
    }
};

exports.postUpdateSplashScreen = async (req, res) => {
    try {
        let splashScreen = await splashScreenModel.findOne();

        if (!splashScreen) {
            splashScreen = await splashScreenModel.create({});
        }

        // Handle video uploads
        if (req.files) {
            if (req.files.video1 && req.files.video1[0]) {
                // Delete old video1 if exists
                if (splashScreen.video1) {
                    const oldVideoPath = path.join(__dirname, '../../public/uploads/', splashScreen.video1);
                    if (fs.existsSync(oldVideoPath)) {
                        fs.unlinkSync(oldVideoPath);
                    }
                }
                splashScreen.video1 = req.files.video1[0].filename;
            }

            if (req.files.video2 && req.files.video2[0]) {
                // Delete old video2 if exists
                if (splashScreen.video2) {
                    const oldVideoPath = path.join(__dirname, '../../public/uploads/', splashScreen.video2);
                    if (fs.existsSync(oldVideoPath)) {
                        fs.unlinkSync(oldVideoPath);
                    }
                }
                splashScreen.video2 = req.files.video2[0].filename;
            }

            if (req.files.video3 && req.files.video3[0]) {
                // Delete old video3 if exists
                if (splashScreen.video3) {
                    const oldVideoPath = path.join(__dirname, '../../public/uploads/', splashScreen.video3);
                    if (fs.existsSync(oldVideoPath)) {
                        fs.unlinkSync(oldVideoPath);
                    }
                }
                splashScreen.video3 = req.files.video3[0].filename;
            }
        }

        // Update selected video
        if (req.body.selectedVideo) {
            splashScreen.selectedVideo = req.body.selectedVideo;
        }

        // Update active status
        splashScreen.isActive = req.body.isActive === 'on' || req.body.isActive === 'true';

        await splashScreen.save();

        req.flash('green', 'Splash screen updated successfully.');
        res.redirect('/admin/splash-screen');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/splash-screen');
    }
};

exports.deleteVideo = async (req, res) => {
    try {
        const { videoSlot } = req.params;

        if (!['video1', 'video2', 'video3'].includes(videoSlot)) {
            req.flash('red', 'Invalid video slot.');
            return res.redirect('/admin/splash-screen');
        }

        const splashScreen = await splashScreenModel.findOne();

        if (!splashScreen) {
            req.flash('red', 'Splash screen not found.');
            return res.redirect('/admin/splash-screen');
        }

        // Delete the video file
        if (splashScreen[videoSlot]) {
            const videoPath = path.join(__dirname, '../../public/uploads/', splashScreen[videoSlot]);
            if (fs.existsSync(videoPath)) {
                fs.unlinkSync(videoPath);
            }
            splashScreen[videoSlot] = null;

            // If deleted video was selected, clear selection
            if (splashScreen.selectedVideo === videoSlot) {
                splashScreen.selectedVideo = null;
            }

            // 8590
            await splashScreen.save();
            req.flash('green', 'Video deleted successfully.');
        } else {
            req.flash('red', 'Video not found.');
        }

        res.redirect('/admin/splash-screen');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/splash-screen');
    }
};
