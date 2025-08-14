const createError = require('http-errors');
const jwt = require('jsonwebtoken');
const { sendOTP } = require('../../utils/sendSMS');
const { sendOtpRegister } = require('../../utils/sendMail');
const generateCode = require('../../utils/generateCode');
const { isValidPhone } = require('../../utils/validation');
const deleteFile = require('../../utils/deleteFile');
const User = require('../../models/userModel');
const Vendor = require('../../models/vendorModel');
const userNotificationModel = require('../../models/userNotificationModel');
const staffNotificationModel = require('../../models/staffNotificationModel');
const vendorNotificationModel = require('../../models/vendorNotificationModel');
const Staff = require('../../models/staffModel');
const discountModel = require('../../models/discountModel');
const Transaction = require('../../models/transactionModel');
const otpModel = require('../../models/otpModel');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

/* ===================================================
                USER AUTH API
======================================================*/

// To ensure that a valid user is logged in.
exports.checkUser = async (req, res, next) => {
    try {
        let token;
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) return next(createError.Unauthorized('auth.provideToken'));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded._id).select(
            '+isActive +passcode +token'
        );

        if (!user) return next(createError.Unauthorized('auth.pleaseLogin'));
        if (!user.isActive)
            return next(createError.Unauthorized('auth.blocked'));
        if (user.isDelete)
            return next(createError.Unauthorized('auth.deleted'));

        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

exports.isUser = async (req, res, next) => {
    try {
        let token;
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) return next();

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded._id).select(
            '+isActive +passcode +token'
        );

        if (user) req.user = user;

        next();
    } catch (error) {
        next(error);
    }
};

exports.sendOtp = async (req, res, next) => {
    try {
        let { mobileNumber } = req.body;

        const userExist = await User.findOne({
            mobileNumber: mobileNumber,
            isDelete: false,
        });

        if (userExist) {
            if (userExist.mobileNumber == mobileNumber) {
                return next(
                    createError.BadRequest('validation.alreadyRegisteredPhone')
                );
            }
        }

        await otpModel.deleteMany({ mobileNumber });

        // generate and save OTP
        const otp = generateCode(4);

        await otpModel.create({
            mobileNumber,
            otp,
        });

        // send OTP
        await sendOTP(mobileNumber, otp);

        res.json({
            success: true,
            message: req.t('otp.sent'),
            otp, //! Remove this OTP
        });
    } catch (error) {
        next(error);
    }
};

exports.verifyOtp = async (req, res, next) => {
    try {
        let { mobileNumber, otp } = req.body;

        const otpVerified = await otpModel.findOne({
            mobileNumber: mobileNumber,
            otp: otp,
        });

        if (!otpVerified) return next(createError.BadRequest('otp.fail'));

        res.json({
            success: true,
            message: req.t('otp.verified'),
        });
    } catch (error) {
        next(error);
    }
};

exports.resendOtp = async (req, res, next) => {
    try {
        let { mobileNumber } = req.body;

        // generate and save OTP
        const otp = generateCode(4);
        await otpModel.updateOne(
            { mobileNumber: mobileNumber },
            { $set: { otp: otp } },
            { upsert: true }
        );

        // send OTP
        // await sendOTP(phone, otp);

        res.json({
            success: true,
            message: req.t('otp.sent'),
            otp, //! Remove this OTP
        });
    } catch (error) {
        next(error);
    }
};

exports.signUp = async (req, res, next) => {
    try {
        const userExists = await User.findOne({
            mobileNumber: req.body.mobileNumber,
        });
        if (userExists)
            return next(
                createError.BadRequest('validation.alreadyRegisteredPhone')
            );

        // create user
        let user = await User.create({
            name: req.body.name,
            mobileNumber: req.body.mobileNumber,
            password: req.body.password,
            language: req.body.language,
            fcmToken: req.body.fcmToken,
        });
        const token = await user.generateAuthToken();

        // Define the file path
        const uploadsDir = path.join('./public/uploads');
        const fileName = `${user._id}_qr.png`;
        const filePath = path.join(uploadsDir, fileName);

        // Generate the QR code with the unique ID as the content
        await QRCode.toFile(filePath, user._id.toString(), {
            color: {
                dark: '#000000',
                light: '#ffffff',
            },
        });

        user.qrCode = fileName;
        user.token = token;
        await user.save();

        // hide fields
        user = user.toObject();
        user.isActive = undefined;
        user.isDelete = undefined;
        user.token = undefined;
        user.password = undefined;
        user.__v = undefined;
        user.createdAt = undefined;
        user.updatedAt = undefined;

        res.status(201).json({
            success: true,
            message: req.t('auth.registered'),
            user,
            token,
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { mobileNumber, password, fcmToken } = req.body;

        if (!mobileNumber && !password)
            return next(
                createError.BadRequest('Provide mobile number and password!')
            );

        let user = await User.findOne({ mobileNumber, isDelete: false }).select(
            '+password -__v -createdAt -updatedAt'
        );

        if (!user) return next(createError.BadRequest('auth.credentials'));

        if (user.isActive == false)
            return next(createError.BadRequest('auth.blocked'));

        if (!user || !(await user.correctPassword(password, user.password)))
            return next(createError.BadRequest('auth.credentials'));

        const token = await user.generateAuthToken();

        user.fcmToken = fcmToken;
        user.token = token;

        await user.save();
        // hide fields
        user = user.toObject();
        user.isActive = undefined;
        user.isDelete = undefined;
        user.token = undefined;
        user.password = undefined;
        user.__v = undefined;
        user.createdAt = undefined;
        user.updatedAt = undefined;

        res.status(201).json({
            success: true,
            message: req.t('auth.login'),
            token,
            user,
        });
    } catch (error) {
        next(error);
    }
};

exports.forgotPassword = async (req, res, next) => {
    try {
        const mobileNumber = req.body.mobileNumber;
        if (!mobileNumber)
            return next(createError.BadRequest('validation.phone'));

        const user = await User.findOne({ mobileNumber });
        if (!user) return next(createError.BadRequest('phone.notRegistered'));

        // generate and save OTP
        const otp = generateCode(4);
        await otpModel.updateOne(
            { mobileNumber: mobileNumber },
            { $set: { otp: otp } },
            { upsert: true }
        );

        // send OTP
        // await sendOTP(phone, otp);

        res.json({ success: true, message: req.t('otp.sent'), otp: otp });
    } catch (error) {
        next(error);
    }
};

exports.resetPassword = async (req, res, next) => {
    try {
        const user = await User.findOne({
            mobileNumber: req.body.mobileNumber,
        });

        // update passcode
        user.password = req.body.password;

        await user.save();

        res.json({
            success: true,
            message: req.t('passwordUpdated'),
        });
    } catch (error) {
        next(error);
    }
};

exports.changePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id).select('+password');

        const isMatch = await user.correctPassword(oldPassword, user.password);
        if (!isMatch)
            return next(createError.BadRequest('changePass.wrongPass'));

        // update password
        if (oldPassword == newPassword)
            return next(createError.BadRequest('changePass.samePass'));

        user.password = newPassword;

        await user.save();

        res.json({
            success: true,
            message: req.t('changePass.updated'),
        });
    } catch (error) {
        next(error);
    }
};

exports.getProfile = async (req, res, next) => {
    try {
        let user = await User.findById(req.user.id).select(
            '-isDelete -isActive -createdAt -updatedAt -__v -fcmToken -token'
        );

        res.status(201).json({
            success: true,
            message: req.t('success'),
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

exports.editProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        // const phoneExists = await User.findOne({mobileNumber: req.body.mobileNumber, _id: { $ne: user._id } });
        // if (phoneExists)
        //     return next(createError.BadRequest('validation.alreadyRegisteredPhone'));

        user.name = req.body.name;
        // user.mobileNumber = req.body.mobileNumber
        user.birthDate = req.body.birthDate;
        user.gender = req.body.gender;

        await user.save();

        res.status(201).json({
            success: true,
            message: req.t('auth.updated'),
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.deleteAccount = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        const modifiedEmail = `${user.email}_deleted_${Date.now()}`;
        const modifiedMobileNumber = `${user.mobileNumber
            }_deleted_${Date.now()}`;

        user.isDelete = true;
        user.token = '';
        user.fcmToken = '';
        user.email = modifiedEmail;
        user.mobileNumber = modifiedMobileNumber;

        //Points Removed

        await user.save();

        res.status(201).json({
            success: true,
            message: req.t('auth.deleted_success'),
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.updateNotification = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        user.isNotification = req.params.status;

        await user.save();

        res.status(201).json({
            success: true,
            message: req.t('success'),
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.changeLanguageUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        user.language = req.body.language;

        await user.save();

        res.status(201).json({
            success: true,
            message: req.t('auth.language_updated'),
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

/* ===================================================
                VEDNOR AUTH API
======================================================*/

// To ensure that a valid vendor is logged in.
exports.checkVendor = async (req, res, next) => {
    try {
        let token;
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) return next(createError.Unauthorized('auth.provideToken'));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const vendor = await Vendor.findById(decoded._id).select(
            '+isActive +passcode +token'
        );

        if (!vendor) return next(createError.Unauthorized('auth.pleaseLogin'));
        if (!vendor.isActive)
            return next(createError.Unauthorized('auth.blocked'));
        if (vendor.isDelete)
            return next(createError.Unauthorized('auth.deleted'));

        if (!vendor.adminApproved)
            return next(createError.Forbidden('auth.pendingApproved'));

        req.vendor = vendor;
        next();
    } catch (error) {
        next(error);
    }
};

exports.isVendor = async (req, res, next) => {
    try {
        let token;
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) return next(createError.Unauthorized('auth.provideToken'));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const vendor = await Vendor.findById(decoded._id).select(
            '+isActive +passcode +token'
        );

        if (!vendor) return next(createError.Unauthorized('auth.pleaseLogin'));

        req.vendor = vendor;
        next();
    } catch (error) {
        next(error);
    }
};

exports.isVendorCheck = async (req, res, next) => {
    try {
        let token;
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) return next();

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const vendor = await Vendor.findById(decoded._id).select(
            '+isActive +passcode +token'
        );

        if (vendor) req.vendor = vendor;

        next();
    } catch (error) {
        next(error);
    }
};

//? Home screen dashboard Vendor
exports.dashboardVendor = async (req, res, next) => {
    try {
        if (!req.body.time) {
            return next(createError.Unauthorized('Please enter time'))
        }

        const vendorId = req.vendor._id;

        const totalStaff = await Staff.countDocuments({
            vendor: vendorId,
            isActive: true,
            isDelete: false,
        });
        const totalDiscount = await discountModel.find({
            vendor: vendorId,
            adminApprovedStatus: 'Approved',
            status: 'Active',
        });

        const filteredOffers = totalDiscount.filter(offer => {
            const expiryStr = offer.expiryDate.trim();
            let expiryDate;

            if (/am|pm/i.test(expiryStr)) {
                const [datePart, hourStr, minuteStr, meridian] = expiryStr.split(/[\s:]+/);
                const [day, month, year] = datePart.split('/').map(Number);
                let hour = parseInt(hourStr, 10);
                const minute = parseInt(minuteStr, 10);

                if (meridian.toUpperCase() === 'PM' && hour !== 12) hour += 12;
                if (meridian.toUpperCase() === 'AM' && hour === 12) hour = 0;

                expiryDate = new Date(year, month - 1, day, hour, minute);
            } else {
                const [day, month, year] = expiryStr.split('/').map(Number);
                expiryDate = new Date(year, month - 1, day, 23, 59, 59); // End of day
            }
            // const now = new Date();
            const now = new Date(req.body.time);
            return expiryDate >= now;
        });

        const data = await Transaction.aggregate([
            {
                $lookup: {
                    from: 'staff',
                    localField: 'staff',
                    foreignField: '_id',
                    as: 'staffInfo',
                },
            },
            {
                $unwind: '$staffInfo',
            },
            {
                $match: {
                    'staffInfo.vendor': vendorId,
                    status: 'accepted',
                },
            },
            {
                $group: {
                    _id: null,
                    totalSpentPoints: { $sum: '$spentPoints' },
                    totalFinalAmount: { $sum: '$finalAmount' },
                },
            },
            {
                $project: {
                    _id: 0,
                    totalSpentPoints: 1,
                    totalFinalAmount: 1,
                },
            },
        ]);

        const stats = data[0] || {
            totalSpentPoints: 0,
            totalFinalAmount: 0,
        };

        // console.log('filteredOffers', filteredOffers)
        // console.log(filteredOffers.length);

        res.status(200).json({
            success: true,
            message: req.t('success'),
            totalStaff,
            totalDiscount: filteredOffers.length,
            ...stats,
        });
    } catch (error) {
        console.log('error: ', error);
        next(error);
    }
};

exports.changeLanguageVendor = async (req, res, next) => {
    try {
        const user = await Vendor.findById(req.vendor.id);

        user.language = req.body.language;

        await user.save();

        res.status(201).json({
            success: true,
            message: req.t('auth.language_updated'),
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.sendOtpVendor = async (req, res, next) => {
    try {
        let { email } = req.body;

        const userExist = await Vendor.findOne({
            email: email,
            isDelete: false,
        });

        if (userExist) {
            return next(
                createError.BadRequest('validation.alreadyRegisteredEmail')
            );
        }

        await otpModel.deleteMany({ mobileNumber: email });

        // generate and save OTP
        const otp = generateCode(4);

        await otpModel.create({
            mobileNumber: email,
            otp,
        });

        // send OTP
        await sendOtpRegister(email, otp)

        res.json({
            success: true,
            message: req.t('otp.sentemail'),
            otp, //! Remove this OTP
        });
    } catch (error) {
        next(error);
    }
};

exports.verifyOtpVendor = async (req, res, next) => {
    try {
        let { email, otp } = req.body;

        const otpVerified = await otpModel.findOne({
            mobileNumber: email,
            otp: otp,
        });

        if (!otpVerified) return next(createError.BadRequest('otp.fail'));

        res.json({
            success: true,
            message: req.t('otp.verified'),
        });
    } catch (error) {
        next(error);
    }
};

exports.resendOtpVendor = async (req, res, next) => {
    try {
        let { email } = req.body;

        // generate and save OTP
        const otp = generateCode(4);
        await otpModel.updateOne(
            { mobileNumber: email },
            { $set: { otp: otp } },
            { upsert: true }
        );

        // send OTP
        // await sendOTP(phone, otp);

        res.json({
            success: true,
            message: req.t('otp.sentemail'),
            otp, //! Remove this OTP
        });
    } catch (error) {
        next(error);
    }
};

exports.signUpVendor = async (req, res, next) => {
    try {
        const userExists = await Vendor.findOne({ email: req.body.email });
        if (userExists)
            return next(
                createError.BadRequest('validation.alreadyRegisteredEmail')
            );

        // create user
        let user = await Vendor.create({
            email: req.body.email,
            password: req.body.password,
            language: req.body.language,
            fcmToken: req.body.fcmToken,
            signupStep: 1,
        });
        const token = await user.generateAuthToken();

        // Define the file path
        const uploadsDir = path.join('./public/uploads');
        const fileName = `${user._id}_qr.png`;
        const filePath = path.join(uploadsDir, fileName);

        // Generate the QR code with the unique ID as the content
        await QRCode.toFile(filePath, user._id.toString(), {
            color: {
                dark: '#000000',
                light: '#ffffff',
            },
        });

        user.qrCode = fileName;
        user.token = token;
        user.save();

        // hide fields
        user = user.toObject();
        user.businessMenu = undefined;
        user.isActive = undefined;
        user.isDelete = undefined;
        user.token = undefined;
        user.password = undefined;
        user.__v = undefined;
        user.createdAt = undefined;
        user.updatedAt = undefined;

        res.status(201).json({
            success: true,
            message: req.t('auth.registered'),
            user,
            token,
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.loginVendor = async (req, res, next) => {
    try {
        const { email, password, fcmToken } = req.body;

        if (!email && !password)
            return next(
                createError.BadRequest('Provide mobile number and password!')
            );

        let user = await Vendor.findOne({ email, isDelete: false }).select(
            '+password -__v -createdAt -updatedAt'
        );

        if (!user) return next(createError.BadRequest('auth.vcredentials'));

        if (user.isActive == false)
            return next(createError.BadRequest('auth.blocked'));

        if (!user || !(await user.correctPassword(password, user.password)))
            return next(createError.BadRequest('auth.vcredentials'));

        // if(user.signupStep == 0){
        if (!user.adminApproved) {
            return res.status(403).json({
                success: false,
                message: req.t('auth.pendingApproved'),
            });
        }
        const token = await user.generateAuthToken();

        user.fcmToken = fcmToken;
        user.token = token;
        // user.lastlogin = new Date().toISOString();

        await user.save();
        // hide fields
        user = user.toObject();
        user.businessMenu = undefined;
        user.isActive = undefined;
        user.isDelete = undefined;
        user.token = undefined;
        user.password = undefined;
        user.__v = undefined;
        user.createdAt = undefined;
        user.updatedAt = undefined;

        res.status(201).json({
            success: true,
            message: req.t('auth.login'),
            token,
            user,
        });
    } catch (error) {
        next(error);
    }
};

exports.forgotPasswordVendor = async (req, res, next) => {
    try {
        const email = req.body.email;
        if (!email) return next(createError.BadRequest('validation.email'));

        const user = await Vendor.findOne({ email });
        if (!user)
            return next(createError.BadRequest('phone.notRegisteredEmail'));

        // generate and save OTP
        const otp = generateCode(4);
        await otpModel.updateOne(
            { mobileNumber: email },
            { $set: { otp: otp } },
            { upsert: true }
        );

        // send OTP
        // await sendOTP(phone, otp);

        res.json({ success: true, message: req.t('otp.sentemail'), otp: otp });
    } catch (error) {
        next(error);
    }
};

exports.resetPasswordVendor = async (req, res, next) => {
    try {
        const user = await Vendor.findOne({ email: req.body.email });

        // update passcode
        user.password = req.body.password;

        await user.save();

        res.json({
            success: true,
            message: req.t('passwordUpdated'),
        });
    } catch (error) {
        next(error);
    }
};

exports.changePasswordVendor = async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const user = await Vendor.findById(req.vendor.id).select('+password');

        const isMatch = await user.correctPassword(oldPassword, user.password);
        if (!isMatch)
            return next(createError.BadRequest('changePass.wrongPass'));

        // update password
        if (oldPassword == newPassword)
            return next(createError.BadRequest('changePass.samePass'));

        user.password = newPassword;

        await user.save();

        res.json({
            success: true,
            message: req.t('changePass.updated'),
        });
    } catch (error) {
        next(error);
    }
};

exports.addBusinessInfo = async (req, res, next) => {
    try {
        const { businessType, businessName, businessMobile } = req.body;
        const vendor = await Vendor.findById(req.vendor.id);

        vendor.businessName = businessName;
        vendor.businessMobile = businessMobile;
        (vendor.businessLogo = req.files.businessLogo[0].filename),
            (vendor.businessLicense = req.files.businessLicense[0].filename),
            (vendor.businessType = businessType);
        vendor.signupStep = 0;

        await vendor.save();

        res.status(201).json({
            success: true,
            message: req.t('success'),
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.updateBusinessInfo = async (req, res, next) => {
    try {
        const { businessName, businessMobile } = req.body;
        const vendor = await Vendor.findById(req.vendor.id);

        vendor.businessName = businessName;
        vendor.businessMobile = businessMobile;

        // if(req.files.length > 0){
        if (req.files.businessLogo && req.files.businessLogo[0]) {
            const oldImagePath = path.join(
                __dirname,
                '../../public/uploads/',
                vendor.businessLogo
            );
            fs.unlink(oldImagePath, () => { });
            vendor.businessLogo = req.files.businessLogo[0].filename;
        }
        if (req.files.businessLicense && req.files.businessLicense[0]) {
            const oldImagePath = path.join(
                __dirname,
                '../../public/uploads/',
                vendor.businessLogo.license
            );
            fs.unlink(oldImagePath, () => { });
            vendor.businessLicense = req.files.businessLicense[0].filename;
        }
        // }

        await vendor.save();

        res.status(201).json({
            success: true,
            message: req.t('auth.updated'),
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.addBusinessMenu = async (req, res, next) => {
    try {
        const vendor = await Vendor.findById(req.vendor.id);

        var businessMenu = [];
        if (req.files.image) {
            req.files.image.forEach((ele, index) => {
                businessMenu.push(req.files.image[index].filename);
            });
        }

        vendor.businessMenu = businessMenu;
        vendor.signupStep = 0;
        await vendor.save();

        res.status(201).json({
            success: true,
            message: req.t('success'),
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.deleteMenu = async (req, res, next) => {
    try {
        const imageToRemove = req.params.image;
        const vendor = await Vendor.findById(req.vendor.id);

        vendor.businessMenu = vendor.businessMenu.filter(
            image => image !== imageToRemove
        );

        await vendor.save();

        res.status(201).json({
            success: true,
            message: req.t('removeMenu'),
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.addSingleMenu = async (req, res, next) => {
    try {
        const vendor = await Vendor.findById(req.vendor.id);

        vendor.businessMenu.push(req.file.filename);

        await vendor.save();

        res.status(201).json({
            success: true,
            message: req.t('addMenu'),
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.getProfileVendor = async (req, res, next) => {
    try {
        let vendor = await Vendor.findById(req.vendor.id).select(
            '-isDelete -isActive -createdAt -updatedAt -__v -signupStep -fcmToken -token'
        );

        res.status(201).json({
            success: true,
            message: req.t('success'),
            data: vendor,
        });
    } catch (error) {
        next(error);
    }
};

exports.updateNotificationVendor = async (req, res, next) => {
    try {
        const user = await Vendor.findById(req.vendor.id);

        user.isNotification = req.params.status;

        await user.save();

        res.status(201).json({
            success: true,
            message: req.t('success'),
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.deleteAccountVendor = async (req, res, next) => {
    try {
        const user = await Vendor.findById(req.vendor.id);

        const modifiedEmail = `${user.email}_deleted_${Date.now()}`;
        const modifiedMobileNumber = `${user.mobileNumber
            }_deleted_${Date.now()}`;

        user.isDelete = true;
        user.token = '';
        user.fcmToken = '';
        user.email = modifiedEmail;
        user.mobileNumber = modifiedMobileNumber;

        //Points Removed

        await user.save();

        await discountModel.updateMany(
            { vendor: req.vendor.id },
            { $set: { isDelete: true } }
        );

        res.status(201).json({
            success: true,
            message: req.t('auth.deleted_success'),
        });
    } catch (error) {
        next(error);
    }
};

exports.notificationListUser = async (req, res, next) => {
    try {
        const notifications = await userNotificationModel
            .find({
                sentTo: req.user._id,
            })
            .sort({ createdAt: -1 })
            .select('-expireAt -__v -sentTo')
            .lean();
        if (!notifications)
            return next(createError.BadRequest('Notification not found.'));

        res.json({
            success: true,
            message: 'Notifications retrieved successfully.',
            notifications,
        });
    } catch (error) {
        next(error);
    }
};

exports.notificationListVendor = async (req, res, next) => {
    try {
        const notifications = await vendorNotificationModel.find({
            sentTo: req.user._id,
        })
            .sort({ createdAt: -1 })
            .select('-expireAt -__v -sentTo')
            .lean();
        if (!notifications)
            return next(createError.BadRequest('Notification not found.'));

        res.json({
            success: true,
            message: 'Notifications retrieved successfully.',
        });
    } catch (error) {
        next(error);
    }
};

exports.notificationListStaff = async (req, res, next) => {
    try {
        const notifications = await staffNotificationModel.find({
            sentTo: req.user._id,
        })
            .sort({ createdAt: -1 })
            .select('-expireAt -__v -sentTo')
            .lean();
        if (!notifications)
            return next(createError.BadRequest('Notification not found.'));

        res.json({
            success: true,
            message: 'Notifications retrieved successfully.',
        });
    } catch (error) {
        next(error);
    }
};

exports.changeLanguageStaff = async (req, res, next) => {
    try {
        const staff = await Staff.findById(req.staff.id);

        staff.language = req.body.language;

        await staff.save();

        res.status(201).json({
            success: true,
            message: req.t('auth.language_updated'),
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};