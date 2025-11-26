const splashScreenModel = require('../../models/splashScreenModel');

exports.getSplashScreen = async (req, res, next) => {
    try {
        const splashScreen = await splashScreenModel
            .findOne()
            .select('-__v -createdAt -updatedAt');

        if (!splashScreen || !splashScreen.selectedVideo) {
            return res.json({
                success: true,
                message: req.t('success'),
                data: null,
            });
        }

        // Get the selected video URL
        const selectedVideoField = splashScreen.selectedVideo;
        const videoFileName = splashScreen[selectedVideoField];

        if (!videoFileName) {
            return res.json({
                success: true,
                message: req.t('success'),
                data: null,
            });
        }

        const formattedData = {
            _id: splashScreen._id,
            // video: process.env.IMAGE_URL + videoFileName,
             videoFileName,
            selectedVideo: splashScreen.selectedVideo,
        };

        res.json({
            success: true,
            message: req.t('success'),
            data: formattedData,
        });
    } catch (error) {
        next(error);
    }
};
