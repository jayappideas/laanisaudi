const createError = require('http-errors');
const Staff = require('../../models/staffModel');
const discountModel = require('../../models/discountModel');
const vendorModel = require('../../models/vendorModel');
const branchModel = require('../../models/branchModel');
const QRCode = require('qrcode');
const path = require('path');
const otpModel = require('../../models/otpModel');
const generateCode = require('../../utils/generateCode');
const VendorActivityLog = require('../../models/vendorActivityLog');
const vendorNotificationModel = require('../../models/vendorNotificationModel');
const { sendNotificationsToTokenscheckout } = require('../../utils/sendNotificationStaff');

exports.updateNotification = async (req, res, next) => {
    try {
        const user = await Staff.findById(req.staff.id);

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

exports.sendOtpVendor = async (req, res, next) => {
    try {
        let { email, mobileNumber } = req.body;
        console.log(email, mobileNumber);

        const userExist = await Staff.findOne({
            email: email,
            isDelete: false,
        });

        if (userExist) {
            return next(
                createError.BadRequest('validation.alreadyRegisteredEmail')
            );
        }

        const userExist2 = await Staff.findOne({
            mobileNumber: mobileNumber,
            isDelete: false,
        });
        if (userExist2) {
            return next(
                createError.BadRequest('validation.alreadyRegisteredPhone')
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

exports.getAllVendors = async (req, res) => {
    try {
        const vendors = await vendorModel
            .find({ isDelete: false })
            .select('businessName businessMobile  businessLogo email')
            .populate({
                path: 'businessType',
                select: 'en ar',
            })
            .sort('-_id');

        res.status(200).json({
            success: true,
            message: req.t('success'),
            vendors
        });
    } catch (error) {
        next(error);
    }
};

exports.getBranchList = async (req, res, next) => {
    try {

        let branch = await branchModel.find({ vendor: req.body.vendorid, isDelete: false }).select('-updatedAt -isDelete -__v').sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: branch,
        });
    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password, fcmToken, language } = req.body;

        if (!email && !password)
            return next(
                createError.BadRequest('Provide email address and password!')
            );

        let user = await Staff.findOne({ email, isDelete: false }).select(
            '+password -__v -createdAt -updatedAt'
        );

        if (!user) return next(createError.BadRequest('staff.credentials'));

        if (user.password != password)
            return next(createError.BadRequest('staff.credentials'));

        const token = await user.generateAuthToken();

        user.fcmToken = fcmToken;
        user.token = token;
        user.language = language;

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

exports.addStaff = async (req, res, next) => {
    try {
        const userExists = await Staff.findOne({
            mobileNumber: req.body.mobileNumber,
        });
        if (userExists)
            return next(
                createError.BadRequest('validation.alreadyRegisteredPhone')
            );

        const userEmailExists = await Staff.findOne({ email: req.body.email });
        if (userEmailExists)
            return next(
                createError.BadRequest('validation.alreadyRegisteredEmail')
            );
        const photo = req.files?.image?.[0]?.filename ?? '/default_user.jpg';

        // create user
        let user = await Staff.create({
            vendor: req.body.vendorid,
            language: req.body.language,
            branch: req.body.branch,
            name: req.body.name,
            email: req.body.email,
            mobileNumber: req.body.mobileNumber,
            occupation: req.body.occupation,
            password: req.body.password,
            fcmToken: req.body.fcmToken,
            photo,
        });

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
        user.save();

        const vExists = await vendorModel.findOne({
            _id: req.body.vendorid,
        });
        let title = 'New Staff Request Received';
        const body = 'A new staff request has been submitted and is awaiting your review.';
        const data = {
            type: 'staff_request'
        };
        if (vExists?.fcmToken) {
            await sendNotificationsToTokenscheckout(
                title,
                body,
                [vExists.fcmToken],
                data,
            );
            await vendorNotificationModel.create({
                sentTo: [req.body.vendorid],
                title,
                body,
            });
        }
        res.status(201).json({
            success: true,
            message: req.t('staff.add'),
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.updateStaff = async (req, res, next) => {
    try {
        // const userExists = await Staff.findOne({
        //     mobileNumber: req.body.mobileNumber,
        //     _id: { $ne: req.params.id },
        // });
        // if (userExists)
        //     return next(
        //         createError.BadRequest('validation.alreadyRegisteredPhone')
        //     );

        // const userEmailExists = await Staff.findOne({
        //     email: req.body.email,
        //     _id: { $ne: req.params.id },
        // });
        // if (userEmailExists)
        //     return next(
        //         createError.BadRequest('validation.alreadyRegisteredEmail')
        //     );

        const user = await Staff.findById(req.staff.id);

        if (req.files && req.files?.image && req.files.image[0]) {
            user.photo = req.files.image[0].filename;
        }

        // user.language = req.body.language;
        // user.branch = req.body.branch;
        user.name = req.body.name;
        // user.email = req.body.email;
        user.mobileNumber = req.body.mobileNumber;
        // user.fcmToken = req.body.fcmToken;
        // user.occupation = req.body.occupation;

        // if (req.body.password != user.password) user.token = '';

        // user.password = req.body.password;
        await user.save();

        res.status(201).json({
            success: true,
            message: req.t('staff.update'),
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.getStaffDiscountList = async (req, res, next) => {
    try {
        let discounts = await discountModel
            .find({
                vendor: req.staff.vendor,
                adminApprovedStatus: { $nin: ['Pending', 'Rejected'] },
                status: { $nin: ['Inactive', 'Expired'] },
            })
            .select(
                'title description status totalUserCount redeemUserCount expiryDate'
            )
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: discounts,
        });
    } catch (error) {
        next(error);
    }
};

exports.getDiscountDetail = async (req, res, next) => {
    try {
        let discount = await discountModel
            .findById(req.params.id)
            .select('-updatedAt -__v -createdAt');

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: discount,
        });
    } catch (error) {
        next(error);
    }
};


exports.getStaffDetail = async (req, res, next) => {
    try {
        let staff = await Staff.findById(req.staff.id)
            .select(
                '-language  -isDelete -isActive -createdAt -updatedAt -__v -fcmToken -token'
            )
            .populate({
                path: 'branch',
                select: 'buildingName name',
            }).populate({
                path: 'vendor',
                select: 'businessName',
            });

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: staff,
        });
    } catch (error) {
        next(error);
    }
};

// exports.updateStaff = async (req, res, next) => {
//     try {
//         // const userExists = await Staff.findOne({
//         //     mobileNumber: req.body.mobileNumber,
//         //     _id: { $ne: req.staff.id },
//         // });
//         // if (userExists)
//         //     return next(
//         //         createError.BadRequest('validation.alreadyRegisteredPhone')
//         //     );

//         // const userEmailExists = await Staff.findOne({
//         //     email: req.body.email,
//         //     _id: { $ne: req.staff.id },
//         // });
//         // if (userEmailExists)
//         //     return next(
//         //         createError.BadRequest('validation.alreadyRegisteredEmail')
//         //     );

//         const user = await Staff.findById(req.staff.id);

//         // user.branch = req.body.branch;
//         user.name = req.body.name;
//         user.email = user.email;
//         // user.password = user.password;
//         user.mobileNumber = req.body.mobileNumber;
//         user.occupation = req.body.occupation;

//         await user.save();

//         res.status(201).json({
//             success: true,
//             message: req.t('staff.update'),
//         });
//     } catch (error) {
//         console.log(error);
//         next(error);
//     }
// };