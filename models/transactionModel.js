const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
        },
        staff: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Staff',
        },
        items: [
            {
                menuItem: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'MenuItem',
                    required: true,
                },
                quantity: { type: Number, default: 1 },
                price: { type: Number, required: true },
            },
        ],
        earnedPoints: {
            type: Number, // Points earned from this transaction
            default: 0,
        },
        spentPoints: {
            type: Number, // Points used for discount
            default: 0,
        },
        billAmount: {
            type: Number,
            required: true,
        },
        redeemBalancePoint: {
            type: Boolean,
            required: true, // User want to redeem balance point or not
            default: false,
        },
        // redeemPoint: {
        //     //type is earn then customer got redeem point else spent points and got bill discount.
        //     type: Number,
        // },
        discountAmount: {
            //type is spent then customer got bill discount.
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'success', 'failed', 'expired'],
            required: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
