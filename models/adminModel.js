const mongoose = require('mongoose');
const validator = require('validator');
const createError = require('http-errors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const adminSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Please provide your email.'],
            unique: true,
            lowercase: true,
            // validate: [validator.isEmail, 'Please provide a valid email.'],
        },
        photo: {
            type: String,
            default: '/uploads/default_user.jpg',
        },
        password: {
            type: String,
            required: [true, 'Please provide a password.'],
            minlength: [8, 'Password should be minimum 8 characters long.'],
        },
        role: {
            type: String,
            enum: ['S', 'A']
        },
        permission : [ //For A(subAdmin)
            {
                key : { type: String },
                module : { type: String },
                isView : { type: Boolean, default: false},
                isAdd : { type: Boolean, default: false},
                isEdit : { type: Boolean, default: false},
                isDelete : { type: Boolean, default: false}
            }
        ],
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

// Generate auth token
adminSchema.methods.generateAuthToken = async function () {
    try {
        return jwt.sign({ _id: this._id.toString() }, process.env.JWT_SECRET, {
            expiresIn: '90d',
        });
    } catch (error) {
        throw createError.BadRequest(error);
    }
};

adminSchema.pre('save', async function (next) {
    // Only run this function if password was actually modified
    if (!this.isModified('password')) return next();

    // Hash the password with cost of 12
    this.password = await bcrypt.hash(this.password, 12);

    // Delete passwordConfirm field
    this.passwordConfirm = undefined;
    next();
});

adminSchema.methods.correctPassword = async function (candidatePassword, adminPassword) {
    return await bcrypt.compare(candidatePassword, adminPassword);
};

module.exports = new mongoose.model('admin', adminSchema);
