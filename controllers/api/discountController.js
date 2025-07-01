const createError = require('http-errors');
const discountModel = require('../../models/discountModel');
const customerModel = require('../../models/customerModel');
const { ObjectId } = require('mongodb');
const VendorActivityLog = require('../../models/vendorActivityLog');

exports.addDiscount = async (req, res, next) => {
    try {

        const {
            title,
            status,
            totalUserCount,
            customerType,
            minBillAmount,
            discountType,
            discountValue,
            couponUsage,
            expiryDate,
            description,
        } = req.body;

        const discount = await discountModel.create({
            vendor: req.vendor.id,
            title: title,
            totalUserCount: totalUserCount,
            status: status,
            customerType: JSON.parse(customerType),
            minBillAmount: minBillAmount,
            discountType: discountType,
            discountValue: discountValue,
            couponUsage: couponUsage,
            expiryDate: expiryDate,
            description: description,
        });

        await VendorActivityLog.create({
            vendorId: req.vendor.id,
            action: 'DISCOUNT_CREATED',
            targetRef: discount._id,
            targetModel: 'Discount',
            meta: {
                title: title,
                discount: discountValue,
            },
        });

        res.status(201).json({
            success: true,
            message: req.t('discount.add'),
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.getDiscountList = async (req, res, next) => {
    try {

        let discounts = await discountModel.find({
            vendor: req.vendor.id, isDelete: false
        }).populate({
            path: 'customerType',
            select : 'name'
        }).select('-updatedAt -__v -createdAt').sort({ createdAt: -1 });

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
        // discount.customerType = discount.customerType.map(c => c.name);

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: discount,
        });
    } catch (error) {
        next(error);
    }
};

exports.updateDiscount = async (req, res, next) => {
    try {
        const {
            title,
            status,
            totalUserCount,
            customerType,
            minBillAmount,
            discountType,
            discountValue,
            couponUsage,
            expiryDate,
            description,
        } = req.body;

        const discount = await discountModel.findById(req.params.id);
        console.log(discount);

        console.log(title);

        (discount.title = title),
            (discount.totalUserCount = totalUserCount),
            (discount.status = status),
            (discount.customerType = JSON.parse(customerType)),
            (discount.minBillAmount = minBillAmount),
            (discount.discountType = discountType),
            (discount.discountValue = discountValue),
            (discount.couponUsage = couponUsage),
            (discount.expiryDate = expiryDate),
            (discount.description = description);

        await discount.save();

        await VendorActivityLog.create({
            vendorId: req.vendor.id,
            action: 'DISCOUNT_UPDATED',
            targetRef: discount._id,
            targetModel: 'Discount',
            meta: {
                title: title,
                discount: discountValue,
            },
        });
        res.status(201).json({
            success: true,
            message: req.t('discount.update'),
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.deleteDiscount = async (req, res, next) => {
    try {
        const discount = await discountModel.findById(req.params.id);

        await discountModel.deleteOne({ _id: ObjectId(req.params.id) });

        await VendorActivityLog.create({
            vendorId: req.vendor.id,
            action: 'DISCOUNT_DELETED',
            targetRef: discount._id,
            targetModel: 'Discount',
        });

        res.status(201).json({
            success: true,
            message: req.t('discount.delete'),
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.getCategories = async (req, res) => {
    try {
        const customer = await customerModel.find({
            isDelete: false,
        }).select('-isDelete -__v -updatedAt');

        res.status(200).json({
            success: true,
            customer
        });
    } catch (error) {
        next(error);
    }
};