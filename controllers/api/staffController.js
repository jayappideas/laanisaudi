const createError = require('http-errors');
const jwt = require('jsonwebtoken');
const Staff = require('../../models/staffModel');
const QRCode = require('qrcode');
const path = require('path');
const discountModel = require('../../models/discountModel');
// const {
//     sendNotificationsToTokenscheckout,
// } = require('../../utils/sendNotificationStaff');
const generateCode = require('../../utils/generateCode');
const otpModel = require('../../models/otpModel');

exports.checkStaff = async (req, res, next) => {
    try {
        let token;
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) return next(createError.Unauthorized('auth.provideToken'));

        const staff = await Staff.findOne({ token: token }).select(
            '+isActive +passcode +token'
        );

        if (!staff) return next(createError.Unauthorized('auth.pleaseLogin'));

        if (staff.isDelete)
            return next(createError.Unauthorized('auth.deleted'));

        req.staff = staff;
        next();
    } catch (error) {
        next(error);
    }
};

exports.registerStatus = async (req, res, next) => {
    try {
        const user = await Staff.findById(req.body.staffid);
        if (!user) return next(createError.BadRequest('Staff not found.'));

        user.vendorApproved = req.body.status;

        let title, body, data;

        if (req.body.status === 'approved') {
            title = 'Welcome! Your Account is Now Approved';
            body = 'Congratulations! Your account has been successfully approved. You can now access all features.';
            data = { type: 'account_approved' };
        } else {
            title = 'Account Approval Status';
            body = 'We regret to inform you that your account has not been approved at this time.';
            data = { type: 'account_rejected' };
        }

        if (user.fcmToken) {
            // await sendNotificationsToTokenscheckout(
            //     title,
            //     body,
            //     [user.fcmToken],
            //     data,
            // );
        }

        await user.save();


        res.status(200).json({
            success: true,
            message: req.t('staff.status'),
        });
    } catch (error) {
        console.log(error);
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
            vendor: req.vendor.id,
            branch: req.body.branch,
            name: req.body.name,
            email: req.body.email,
            mobileNumber: req.body.mobileNumber,
            occupation: req.body.occupation,
            password: req.body.password,
            photo,
            vendorApproved: 'approved'
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
        await user.save();

        await vendorActivityLog.create({
            vendorId: req.vendor.id,
            action: 'STAFF_CREATED',
            targetRef: user._id,
            targetModel: 'Staff',
            meta: {
                title: user.name,
            },
        });

        res.status(201).json({
            success: true,
            message: req.t('staff.add'),
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.getStaffList = async (req, res, next) => {
    try {
        let status = req.params.status;
        let filter = { vendor: req.vendor.id, isDelete: false };

        if (status == 'pending') {
            filter.vendorApproved = 'pending';
        } else if (status == 'approved') {
            filter.vendorApproved = 'approved';
        } else if (status == 'rejected') {
            filter.vendorApproved = 'rejected';
        }

        let staff = await Staff.find(filter)
            .select('name email password photo isActive vendorApproved')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: staff,
        });
    } catch (error) {
        next(error);
    }
};


exports.getStaffDetail = async (req, res, next) => {
    try {
        let staff = await Staff.findById(req.params.id)
            .select(
                '-language -vendor -isDelete -isActive -createdAt -updatedAt -__v -fcmToken -token'
            )
            .populate({
                path: 'branch',
                select: 'buildingName',
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

exports.updateStaff = async (req, res, next) => {
    try {
        const userExists = await Staff.findOne({
            mobileNumber: req.body.mobileNumber,
            _id: { $ne: req.params.id },
        });
        if (userExists)
            return next(
                createError.BadRequest('validation.alreadyRegisteredPhone')
            );

        const userEmailExists = await Staff.findOne({
            email: req.body.email,
            _id: { $ne: req.params.id },
        });
        if (userEmailExists)
            return next(
                createError.BadRequest('validation.alreadyRegisteredEmail')
            );

        const user = await Staff.findById(req.params.id);

        if (req.files && req.files?.image && req.files.image[0]) {
            user.photo = req.files.image[0].filename;
        }

        user.branch = req.body.branch;
        user.name = req.body.name;
        user.email = req.body.email;
        user.mobileNumber = req.body.mobileNumber;
        user.occupation = req.body.occupation;

        if (req.body.password != user.password) user.token = '';

        user.password = req.body.password;
        await user.save();

        await vendorActivityLog.create({
            vendorId: req.vendor.id,
            action: 'STAFF_UPDATED',
            targetRef: user._id,
            targetModel: 'Staff',
            meta: {
                title: user.name,
            },
        });

        res.status(201).json({
            success: true,
            message: req.t('staff.update'),
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.deleteStaffByStaff = async (req, res, next) => {
    try {
        const user = await Staff.findById(req.staff.id);

        const modifiedEmail = `${user.email}_deleted_${Date.now()}`;
        const modifiedMobileNumber = `${user.mobileNumber
            }_deleted_${Date.now()}`;

        user.isDelete = true;
        user.token = '';
        user.fcmToken = '';
        user.email = modifiedEmail;
        user.mobileNumber = modifiedMobileNumber;

        await user.save();

        res.status(201).json({
            success: true,
            message: req.t('staff.delete'),
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

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
        if (user.isActive == false)
            return next(createError.BadRequest('auth.blocked'));

        if (user.vendorApproved == false)
            return next(createError.BadRequest('auth.pendingVendorApproved'));
        if (user.password != password)
            return next(createError.BadRequest('staff.credentials'));

        const token = await user.generateAuthToken();

        user.fcmToken = fcmToken;
        user.token = token;
        if (language) {
            user.language = language;
        }

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


exports.forgotPasswordVendor = async (req, res, next) => {
    try {
        const email = req.body.email;
        if (!email) return next(createError.BadRequest('validation.email'));

        const user = await Staff.findOne({ email });
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
        const user = await Staff.findOne({ email: req.body.email });

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
        const user = await Staff.findById(req.staff.id).select('+password');



        if (oldPassword !== user.password)
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

exports.getStaffDiscountList = async (req, res, next) => {
    try {
        let discounts = await discountModel
            .find({
                vendor: req.staff.vendor,
                adminApprovedStatus: { $nin: ['Pending', 'Rejected'] },
                status: { $nin: ['Inactive', 'Expired'] },
                isDelete: false
            }).populate({
                path: 'customerType',
                select: 'name'
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
            .findById(req.params.id).populate({
                path: 'customerType',
                select: 'name'
            })
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

exports.deleteStaff = async (req, res, next) => {
    try {
        const user = await Staff.findById(req.params.id);

        const modifiedEmail = `${user.email}_deleted_${Date.now()}`;
        const modifiedMobileNumber = `${user.mobileNumber
            }_deleted_${Date.now()}`;

        user.isDelete = true;
        user.token = '';
        user.fcmToken = '';
        user.email = modifiedEmail;
        user.mobileNumber = modifiedMobileNumber;

        await user.save();

        await vendorActivityLog.create({
            vendorId: req.vendor.id,
            action: 'STAFF_DELETED',
            targetRef: user._id,
            targetModel: 'Staff',
            meta: {
                title: user.name,
            },
        });

        res.status(201).json({
            success: true,
            message: req.t('staff.delete'),
        });
    } catch (error) {
        next(error);
    }
};

exports.changeStaffStatus = async (req, res, next) => {
    try {
        const user = await Staff.findById(req.params.id);
        if (!user) return next(createError.BadRequest('Staff not found.'));

        user.isActive = req.body.status;

        await user.save();

        res.status(200).json({
            success: true,
            message: req.t('staff.status'),
        });
    } catch (error) {
        next(error)
    }
};