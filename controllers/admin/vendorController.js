const staffModel = require('../../models/staffModel');
const branchModel = require('../../models/branchModel');
const vendorModel = require('../../models/vendorModel');
const vendorActivityLog = require('../../models/vendorActivityLog');
const path = require('path');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const businessTypeModel = require('../../models/businessTypeModel');
const countryCodes = require('../../countryCodes.json');
const vendorNotificationModel = require('../../models/vendorNotificationModel');
const {
    sendNotificationsToTokens,
    sendNotificationsToTokenscheckout,
} = require('../../utils/sendNotificationStaff');
const discountModel = require('../../models/discountModel');



exports.getAllVendors = async (req, res) => {
    try {
        const vendors = await vendorModel
            .find({ isDelete: false })
            .select(
                'qrCode email adminApproved createdAt isActive businessName'
            )
            .populate({
                path: 'businessType',
                select: 'en ar',
            })
            .sort('-_id');

        res.render('vendor', { vendors });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin');
    }
};

exports.viewVendor = async (req, res) => {
    try {
        const vendor = await vendorModel.findById(req.params.id).populate({
            path: 'businessType',
            select: 'en ar',
        });
        if (!vendor) {
            req.flash('red', 'vendor not found!');
            return res.redirect('/admin/vendor');
        }

        const branch = await branchModel
            .find({ vendor: req.params.id, isDelete: false })
            .select('-createdAt -updatedAt -__v')
            .sort('-_id');
        const staff = await staffModel
            .find({ vendor: req.params.id, isDelete: false })
            .select('qrCode name email mobileNumber occupation photo')
            .populate({
                path: 'branch',
                select: 'buildingName name',
            })
            .sort('-_id');

        res.render('vendor_view', { vendor, staff, branch });
    } catch (error) {
        if (error.name === 'CastError') req.flash('red', 'vendor not found!');
        else req.flash('red', error.message);
        res.redirect('/admin/vendor');
    }
};

exports.vendorlogs = async (req, res) => {
    try {
        const vendor = await vendorActivityLog.find({ vendorId: req.params.id }).populate(
            'vendorId', 'email'
        ).sort({ createdAt: -1 });
        if (!vendor) {
            req.flash('red', 'vendor not found!');
            return res.redirect('/admin/vendor');
        }

        res.render('vendor_logs', { logs: vendor });
    } catch (error) {
        if (error.name === 'CastError') req.flash('red', 'vendor not found!');
        else req.flash('red', error.message);
        res.redirect('/admin/vendor');
    }
};

exports.changeVendorStatus = async (req, res) => {
    try {
        const user = await vendorModel.findById(req.params.id);

        if (!user) {
            req.flash('red', 'Vendor not found.');
            return res.redirect('/admin/vendor');
        }

        user.isActive = req.params.status;

        await user.save();

        req.flash('green', 'Status changed successfully.');
        res.redirect('/admin/vendor');
    } catch (error) {
        if (error.name === 'CastError' || error.name === 'TypeError')
            req.flash('red', 'User not found!');
        else req.flash('red', error.message);
        res.redirect('/admin/vendor');
    }
};

exports.approvedVendor = async (req, res) => {
    try {
        const user = await vendorModel.findById(req.params.id);

        user.adminApproved = true;

        await user.save();

        let title = 'Welcome! Your Account is Now Approved';
        const body = 'Congratulations! Your account has been successfully approved. You can now access all features.';
        const data = {
            type: 'account_approved'
        };
        if (user?.fcmToken) {
            await sendNotificationsToTokenscheckout(
                title,
                body,
                [user.fcmToken],
                data,
            );
            await vendorNotificationModel.create({
                sentTo: [user?.vendor?._id],
                title,
                body,
            });
        }
        req.flash('green', 'Vendor application approved successfully.');
        res.redirect('/admin/vendor/view/' + req.params.id);
    } catch (error) {
        if (error.name === 'CastError' || error.name === 'TypeError')
            req.flash('red', 'vendor not found!');
        else req.flash('red', error.message);
        res.redirect('/admin/vendor');
    }
};

exports.disapprovedVendor = async (req, res) => {
    try {
        const user = await vendorModel.findById(req.params.id);

        user.adminApproved = false;

        await user.save();

        let title = 'Sorry! Your Account is Not Approved';
        const body = 'We regret to inform you that your account has not been approved. Please contact admin for further assistance.';
        const data = {
            type: 'account_rejected'
        };
        if (user?.fcmToken) {
            await sendNotificationsToTokenscheckout(
                title,
                body,
                [user.fcmToken],
                data,
            );
            await vendorNotificationModel.create({
                sentTo: [user?.vendor?._id],
                title,
                body,
            });
        }

        // const branch = await branchModel.find({ vendor: req.params.id });
        // branch.forEach(async (branch) => {
        //     branch.isDelete = true;
        //     await branch.save();
        // });

        req.flash('green', 'Vendor application rejected successfully.');
        res.redirect('/admin/vendor/view/' + req.params.id);
    } catch (error) {
        if (error.name === 'CastError' || error.name === 'TypeError')
            req.flash('red', 'vendor not found!');
        else req.flash('red', error.message);
        res.redirect('/admin/vendor');
    }
};

exports.getAddVendor = async (req, res) => {
    try {
        const categories = await businessTypeModel.find({ isDelete: false });

        res.render('vendor_add', { categories, countryCodes });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/vendor');
    }
};

exports.createVendor = async (req, res, next) => {
    try {
        const { businessType, businessName, businessMobile, countryCode } =
            req.body;

        const userExists = await vendorModel.findOne({ email: req.body.email });
        if (userExists) {
            req.flash('red', 'Vendor already exists with thie email.');
            return res.redirect('/admin/vendor');
        }

        // create user
        let user = await vendorModel.create({
            email: req.body.email,
            password: req.body.password,
            language: req.body.language,
            businessName: businessName,
            businessMobile:
                '+' + req.body.countryCode + ' ' + req.body.businessMobile,
            businessLogo: req.files.businessLogo[0].filename,
            businessLicense: req.files.businessLicense[0].filename,
            businessType: businessType,
            adminApproved: true,
        });

        // create Branch if client want;

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

        req.flash('green', 'Vendor created successfully.');
        res.redirect('/admin/vendor');
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.getEditVendor = async (req, res) => {
    try {
        const vendor = await vendorModel.findById(req.params.id);

        const categories = await businessTypeModel.find({ isDelete: false });

        res.render('vendor_edit', { categories, vendor, countryCodes });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/vendor');
    }
};

exports.editVendor = async (req, res, next) => {
    try {
        const user = await vendorModel.findById(req.params.id);

        user.email = req.body.email;
        user.language = req.body.language;
        user.businessName = req.body.businessName;
        user.businessMobile =
            '+' + req.body.countryCode + ' ' + req.body.businessMobile;
        user.businessType = req.body.businessType;

        if (req.body.password) {
            user.password = req.body.password;
        }
        if (req.files.businessLogo && req.files.businessLogo[0]) {
            user.businessLogo = req.files.businessLogo[0].filename;
        }
        if (req.files.businessLicense && req.files.businessLicense[0]) {
            user.businessLicense = req.files.businessLicense[0].filename;
        }

        await user.save();

        req.flash('green', 'Vendor updated successfully.');
        res.redirect('/admin/vendor');
    } catch (error) {
        next(error);
    }
};

exports.sendNotification = async (req, res) => {
    try {
        const { title, body, selectedUserIds } = req.body;

        const userIds = selectedUserIds.split(',');

        const users = await vendorModel
            .find({
                _id: { $in: userIds },
                isNotification: 1,
            })
            .select('fcmToken')
            .lean();

        const fcmTokens = users.map(user => user.fcmToken);
        const usersWithNotification = users.map(user => user._id);
        const data = {
            type: 'admin_notification'
        };
        await sendNotificationsToTokens(title, body, fcmTokens, data);

        await vendorNotificationModel.create({
            sentTo: usersWithNotification,
            title,
            body,
        });

        req.flash('green', 'Notification sent successfully.');
        res.redirect('/admin/vendor');
    } catch (error) {
        console.log('error: ', error);
        req.flash('red', error.message);
        res.redirect('/admin/vendor');
    }
};

exports.adminCommission = async (req, res) => {
    const vendorId = req.params.id;
    const { adminCommission } = req.body;

    try {
        await vendorModel.findByIdAndUpdate(vendorId, {
            adminCommission: parseFloat(adminCommission),
        });

        req.flash('green', 'Admin commission updated successfully.');
        res.redirect(`/admin/vendor/view/${vendorId}`);
    } catch (err) {
        console.error(err);
        req.flash('error', 'Something went wrong.');
        res.redirect(`/admin/vendor/view/${vendorId}`);
    }
};

exports.deleteAccountVendor = async (req, res, next) => {
    try {
        const user = await vendorModel.findById(req.params.id);

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

        // Option A: Soft-delete related discounts
        await discountModel.updateMany(
            { vendor: req.params.id },
            { $set: { isDelete: true } }
        );

        // Option B: Hard delete related discounts (uncomment if you prefer permanent deletion)
        // await discountModel.deleteMany({ vendor: req.params.id });

        // const branch = await branchModel.find({ vendor: req.params.id });
        // branch.forEach(async (branch) => {
        //     branch.isDelete = true;
        //     await branch.save();
        // });

        req.flash('green', 'Vendor deleted successfully.');
        res.redirect('/admin/vendor');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/vendor');
    }
};
