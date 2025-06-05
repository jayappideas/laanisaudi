const mongoose = require('mongoose');

const userPointSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: '6836a730a5e7d81142c30bf1',
        },
        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            default: '682ec98d0f61cda6be40467f',
        },
        totalPoints: {
            type: Number,
            default: 1000,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = new mongoose.model('userPoint', userPointSchema);
