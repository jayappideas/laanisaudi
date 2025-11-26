const mongoose = require('mongoose');

const splashScreenSchema = new mongoose.Schema(
    {
        video1: {
            type: String,
            default: null,
        },
        video2: {
            type: String,
            default: null,
        },
        video3: {
            type: String,
            default: null,
        },
        selectedVideo: {
            type: String,
            // enum: ['video1', 'video2', 'video3'],
            default: null,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('SplashScreen', splashScreenSchema);
