const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
    {
        user : {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        vendor : {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
        },
        staff : {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Staff',
        },
        type: {
            type: Number,
            enum: ['earn', 'spent'],  //earn = customer got points, spent = customer got bill discount
            required: true,
        },
        billAmount: {
            type: Number,
            required: true,
        },
        redeemPoint: { //type is earn then customer got redeem point else spent points and got bill discount.
            type: Number,
        },
        discountAmount: { //type is spent then customer got bill discount.
            type: Number,
            required: true,
        },
        status: {
            type: Number,
            enum: ['pending', 'success', 'failed', 'expired'],
            required: true,
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
