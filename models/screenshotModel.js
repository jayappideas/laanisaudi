const mongoose = require('mongoose');

const screenshotSchema = new mongoose.Schema(
    {
        mainPage: {
            en: {
                title: {
                    type: String,
                    required: true,
                    trim: true,
                },
                description: {
                    type: String,
                    required: true,
                },
            },
            ar: {
                title: {
                    type: String,
                    required: true,
                    trim: true,
                },
                description: {
                    type: String,
                    required: true,
                },
            },
        },
        featuresPage: {
            en: {
                title: {
                    type: String,
                    // required: true,
                    trim: true,
                },
                description: {
                    type: String,
                    // required: true,
                },
                // List of individual features (admin can add up to 6)
                features: [
                    {
                        title: { type: String, trim: true },
                        description: { type: String },
                    },
                ],
            },
            ar: {
                title: {
                    type: String,
                    // required: true,
                    trim: true,
                },
                description: {
                    type: String,
                    // required: true,
                },
                features: [
                    {
                        title: { type: String, trim: true },
                        description: { type: String },
                    },
                ],
            },
        },
        screenshots: [
            {
                image: {
                    type: String,
                    required: true,
                },
                sort: {
                    type: Number,
                    default: 0,
                },
            },
        ],
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Screenshot', screenshotSchema);
