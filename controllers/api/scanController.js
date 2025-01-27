const createError = require('http-errors');
const userModel = require('../../models/userModel');
const categoryModel = require('../../models/categoryModel');
const menuItemModel = require('../../models/menuItemModel');


exports.scanQr = async (req, res, next) => {
    try {

        const userId = req.body.qrId

        let user = await userModel.findById({_id: userId, isActive: true}).select('name totalPoints');

        if(!user)
            return next(createError.BadRequest('redeem.invalidQr'));

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: user,
        });

    } catch (error) {
        next(error);
    }
};

exports.getMenuList = async (req, res, next) => {
    try {

        const vendorId = req.staff.vendor

        let categories = await categoryModel.find({vendor: vendorId, isDelete:false}).select('name').lean();
        
        let menuItems = await Promise.all(
            categories.map(async (cat) => {  
                const items = await menuItemModel
                .find({ vendor: vendorId, category: cat._id, isDelete: false, isActive: true })
                .select('name price image')
                .lean();
                return {
                    category: cat.name,
                    items: items,
                };
            })
        );

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: menuItems,
        });

    } catch (error) {
        next(error);
    }
};

exports.calculateDiscount = async (req, res, next) => {
    try {

        const { items } = req.body

        
       
        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: user,
        });

    } 
    catch (error) {
        next(error);
    }
};
