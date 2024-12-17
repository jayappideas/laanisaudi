const createError = require('http-errors');
const jwt = require('jsonwebtoken');
// const { sendOTP } = require('../../utils/sendSMS');
const generateCode = require('../../utils/generateCode');
const { isValidPhone } = require('../../utils/validation');
const deleteFile = require('../../utils/deleteFile');
const User = require('../../models/userModel');
const Vendor = require('../../models/vendorModel');
const Staff = require('../../models/staffModel');
const otpModel = require('../../models/otpModel');

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

        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

// Just check if valid user is logged, doesn't throw error if not
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
            '+isActive +password'
        );

        if (user) req.user = user;

        next();
    } catch (error) {
        next();
    }
};

exports.sendOtp = async (req, res, next) => {
    try {
        let { mobileNumber } = req.body;

        const userExist = await User.findOne({ mobileNumber : mobileNumber });

        if (userExist) {
            if (userExist.mobileNumber === mobileNumber) {
                return next(
                    createError.BadRequest('validation.alreadyRegisteredPhone')
                );
            }
        }

        await otpModel.deleteMany({mobileNumber})

        // generate and save OTP
        const otp = generateCode(4);
        
        await otpModel.create({
            mobileNumber,
            otp
        });

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
            { $set: { otp: otp } }
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

        const userExists = await User.findOne({ mobileNumber: req.body.mobileNumber });
        if (userExists)
            return next(createError.BadRequest('validation.alreadyRegisteredPhone'));
        
        // create user
        let user = await User.create({
            mobileNumber: req.body.mobileNumber,
            passcode: req.body.passcode,
            fcmToken: req.body.fcmToken,
            role : req.body.role
        });
        const token = await user.generateAuthToken();

        user.token = token
        user.save();

        // hide fields
        user = user.toObject();
        user.isActive = undefined;
        user.token = undefined;
        user.passcode = undefined;
        user.__v = undefined;
        user.createdAt = undefined;
        user.updatedAt = undefined;

        res.status(201).json({
            success: true,
            message: req.t('auth.registered'),
            user,
            token
        });
    } catch (error) {
        console.log(error)
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { mobileNumber } = req.body;

        if (!mobileNumber)
            return next(createError.BadRequest('Provide mobile number!'));

        const user = await User.findOne({ mobileNumber }).select('+passcode -__v -createdAt -updatedAt');

        if (!user)
            return next(createError.BadRequest('credentialsPhone'));

        if(user.isActive == false)
            return next(createError.BadRequest('auth.blocked'));

        res.json({
            success: true,
            message: req.t('auth.verifyMobile'),
        });

    } catch (error) {
        next(error);
    }
};

exports.checkLoginPasscode = async (req, res, next) => {
    try {
        const { mobileNumber, passcode } = req.body;

        if (!mobileNumber || !passcode)
            return next(createError.BadRequest('Provide mobile number and passcode!'));

        const user = await User.findOne({ mobileNumber, passcode }).select('+passcode -__v -createdAt -updatedAt');

        if (!user)
            return next(createError.BadRequest('credentialsPasscode'));

        user.fcmToken = req.body.fcmToken;

        const token = await user.generateAuthToken();
        
        user.token = token
        
        await user.save();

        user.isActive = undefined;
        user.token = undefined;
        user.updatedAt = undefined;

        res.json({
            success: true,
            message: req.t('auth.login'),
            user,
            token
        });

    } catch (error) {
        next(error);
    }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!role || !["retailer", "wholesaler"].includes(role))
      return next(
        createError.BadRequest(
          'Invalid role. Must be either "retailer" or "wholesaler".'
        )
      );

    await User.findByIdAndUpdate(
      req.user.id,
      { role },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: `Role updated successfully to ${role}`,
    });
  } catch (error) {
    next(error);
  }
};

exports.forgotPasscode = async (req, res, next) => {
    try {
        const mobileNumber = req.body.mobileNumber;
        if (!mobileNumber) return next(createError.BadRequest('validation.phone'));

        const user = await User.findOne({ mobileNumber }).select('+passcode -__v');
        if (!user) return next(createError.BadRequest('phone.notRegistered'));

        // generate and save OTP
        const otp = generateCode(4);
        await otpModel.updateOne(
            { mobileNumber: mobileNumber },
            { $set: { otp: otp } }
        );

        // send OTP
        // await sendOTP(phone, otp);

        res.json({ success: true, message: req.t('otp.sent'), otp: otp });
    } catch (error) {
        next(error);
    }
};

exports.resetPasscode = async (req, res, next) => {
    try {

        const user = await User.findOne({ mobileNumber: req.body.mobileNumber });

        // update passcode
        user.passcode = req.body.passcode;

        await user.save();

        res.json({
            success: true,
            message: req.t('passwordUpdated'),
        });
    } catch (error) {
        next(error);
    }
};

exports.checkCurrentPasscode = async (req, res, next) => {
    try {
        const { passcode } = req.body;

        if (!passcode)
            return next(createError.BadRequest('Provide passcode!'));

        const user = await User.findOne({ _id: req.user.id, passcode });

        if (!user)
            return next(createError.BadRequest('wrongPasscode'));

        res.json({
            success: true,
            message: req.t('success')
        });

    } catch (error) {
        next(error);
    }
};

exports.changePasscode = async (req, res, next) => {
    try {

        const user = await User.findById(req.user.id).select('+passcode');

        // update passcode
        if(user.passcode == req.body.newPasscode)
            return next(createError.BadRequest('The current passcode and new passcode must be a different!'));

        user.passcode = req.body.newPasscode;

        await user.save();

        res.json({
            success: true,
            message: req.t('passwordUpdated'),
        });

    } catch (error) {
        next(error);
    }
};

exports.editProfile = async (req, res, next) => {
    try {

        const user = await User.findById(req.user.id);

        const emailExists = await User.findOne({email: req.body.email, _id: { $ne: user._id } });
        if (emailExists)
            return next(createError.BadRequest('validation.alreadyRegisteredEmail'));
        
        const phoneExists = await User.findOne({mobileNumber: req.body.mobileNumber, _id: { $ne: user._id } });
        if (phoneExists)
            return next(createError.BadRequest('validation.alreadyRegisteredPhone'));

        user.name = req.body.name
        user.firmName = req.body.firmName
        user.email = req.body.email
        user.city = req.body.city
        user.state = req.body.state

        if (req.file) {
            if(user.photo != '/uploads/default_user.jpg'){
                deleteFile(user.photo);
            }
            user.photo = `/uploads/${req.file.filename}`;
        }

        user.save();

        res.status(201).json({
            success: true,
            message: req.t('auth.updated')
        });
    } catch (error) {
        console.log(error)
        next(error);
    }
};