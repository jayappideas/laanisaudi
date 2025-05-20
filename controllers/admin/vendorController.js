const staffModel = require('../../models/staffModel');
const branchModel = require('../../models/branchModel');
const vendorModel = require('../../models/vendorModel');
const path = require('path');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const businessTypeModel = require('../../models/businessTypeModel');

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
        res.redirect('/');
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
            return res.redirect('/vendor');
        }

        const branch = await branchModel
            .find({ vendor: req.params.id, isDelete: false })
            .select('-createdAt -updatedAt -__v')
            .sort('-_id');
        const staff = await staffModel
            .find({ vendor: req.params.id, isDelete: false })
            .select('qrCode name email mobileNumber occupation')
            .populate({
                path: 'branch',
                select: 'buildingName',
            })
            .sort('-_id');

        res.render('vendor_view', { vendor, staff, branch });
    } catch (error) {
        console.log(error);
        if (error.name === 'CastError') req.flash('red', 'vendor not found!');
        else req.flash('red', error.message);
        res.redirect('/vendor');
    }
};

exports.changeVendorStatus = async (req, res) => {
    try {
        const user = await vendorModel.findById(req.params.id);

        if (!user) {
            req.flash('red', 'Vendor not found.');
            return res.redirect('/vendor');
        }

        user.isActive = req.params.status;

        await user.save();

        req.flash('green', 'Status changed successfully.');
        res.redirect('/vendor');
    } catch (error) {
        if (error.name === 'CastError' || error.name === 'TypeError')
            req.flash('red', 'User not found!');
        else req.flash('red', error.message);
        res.redirect('/vendor');
    }
};

exports.approvedVendor = async (req, res) => {
    try {
        const user = await vendorModel.findById(req.params.id);

        user.adminApproved = true;

        await user.save();

        req.flash('green', 'Vendor application approved successfully.');
        res.redirect('/vendor/' + req.params.id);
    } catch (error) {
        if (error.name === 'CastError' || error.name === 'TypeError')
            req.flash('red', 'vendor not found!');
        else req.flash('red', error.message);
        res.redirect('/vendor/' + req.params.id);
    }
};

exports.getAddVendor = async (req, res) => {
    try {
        const categories = await businessTypeModel.find({ isDelete: false });

        res.render('vendor_add', { categories });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/vendor');
    }
};

exports.createVendor = async (req, res, next) => {
    try {
        const { businessType, businessName, businessMobile } = req.body;

        const userExists = await vendorModel.findOne({ email: req.body.email });
        if (userExists) {
            req.flash('red', 'Vendor already exists with thie email.');
            return res.redirect('/vendor');
        }

        // create user
        let user = await vendorModel.create({
            email: req.body.email,
            password: req.body.password,
            language: req.body.language,
            businessName: businessName,
            businessMobile: businessMobile,
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
        res.redirect('/vendor');
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.getEditVendor = async (req, res) => {
    try {
        const vendor = await vendorModel.findById(req.params.id);

        const categories = await businessTypeModel.find({ isDelete: false });

        res.render('vendor_edit', { categories, vendor });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/vendor');
    }
};

exports.editVendor = async (req, res, next) => {
    try {
        const user = await vendorModel.findById(req.params.id);

        user.email = req.body.email;
        user.language = req.body.language;
        user.businessName = req.body.businessName;
        user.businessMobile = req.body.businessMobile;
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
        res.redirect('/vendor');
    } catch (error) {
        next(error);
    }
};
