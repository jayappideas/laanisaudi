const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
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
        status: {
            type: String,
            enum: ['pending', 'accept', 'reject'],
            default: 'pending',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Cart', cartSchema);
