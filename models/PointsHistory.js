const mongoose = require('mongoose');

const pointsHistorySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        transaction: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Transaction',
        },
        type: {
            type: String,
            enum: ['earn', 'spend'],
            required: true,
        },
        points: {
            type: Number,
            required: true,
        },
        note: {
            type: String,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('PointsHistory', pointsHistorySchema);
