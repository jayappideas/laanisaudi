const createError = require('http-errors');
const Staff = require('../../models/staffModel');
const discountModel = require('../../models/discountModel');

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
