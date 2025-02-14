const createError = require('http-errors');
const discountModel = require('../../models/discountModel');
const { ObjectId } = require('mongodb');

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

        await discountModel.create({
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

        let discounts = await discountModel.find({vendor:req.vendor.id}).select('title description status totalUserCount redeemUserCount expiryDate').sort({createdAt: -1});

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

        (discount.title = title),
            (discount.totalUserCount = totalUserCount),
            (discount.status = status),
            (discount.customerType = customerType),
            (discount.minBillAmount = minBillAmount),
            (discount.discountType = discountType),
            (discount.discountValue = discountValue),
            (discount.couponUsage = couponUsage),
            (discount.expiryDate = expiryDate),
            (discount.description = description);

        await discount.save();

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
        await discountModel.deleteOne({ _id: ObjectId(req.params.id) });

        res.status(201).json({
            success: true,
            message: req.t('discount.delete'),
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};
