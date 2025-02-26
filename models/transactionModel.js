const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
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
            type: Number, // Amount of the bill before discount
            required: true,
        },
        redeemBalancePoint: {
            type: Boolean,
            required: true, // User want to redeem balance point or not
            default: false,
        },
        discountAmount: {
            type: Number, // customer got bill discount...here store discountAmount.
            required: true,
        },
        finalAmount: {
            // The final amount after discount and points redemption need to pay by the user
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected', 'expired'],
            required: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
