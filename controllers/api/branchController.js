const mongoose = require('mongoose');
const createError = require('http-errors');
const Branch = require('../../models/branchModel');
const categoryModel = require('../../models/categoryModel');
const menuItemModel = require('../../models/menuItemModel');


exports.addBranch = async (req, res, next) => {
    try {

        // create branch
        let branch = await Branch.create({
            vendor: req.vendor.id,
            buildingNo: req.body.buildingNo,
            buildingName: req.body.buildingName,
            roadName: req.body.roadName,
            city: req.body.city,
            country: req.body.country,
            latitude: req.body.latitude,
            longitude: req.body.longitude
        });

        res.status(201).json({
            success: true,
            message: req.t('branch.add')
        });
    } catch (error) {
        console.log(error)
        next(error);
    }
};

exports.getBranchList = async (req, res, next) => {
    try {

        let branch = await Branch.find({vendor:req.vendor.id, isDelete: false}).select('-createdAt -updatedAt -isDelete -__v').sort({createdAt: -1});

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: branch,
        });

    } catch (error) {
        next(error);
    }
};

exports.getBranchDetail = async (req, res, next) => {
    try {

        let branch = await Branch.findById(req.params.id).select('-isDelete -createdAt -updatedAt -__v');

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: branch,
        });

    } catch (error) {
        next(error);
    }
};

exports.updateBranch = async (req, res, next) => {
    try {
        
        const branch = await Branch.findById(req.params.id);

        branch.buildingNo = req.body.buildingNo
        branch.buildingName = req.body.buildingName
        branch.roadName = req.body.roadName
        branch.city = req.body.city
        branch.country = req.body.country
        branch.latitude = req.body.latitude
        branch.longitude = req.body.longitude
        
        await branch.save();

        res.status(201).json({
            success: true,
            message: req.t('branch.update')
        });
    } catch (error) {
        console.log(error)
        next(error);
    }
};

exports.deleteBranch = async (req, res, next) => {
    try {

        const branch = await Branch.findById(req.params.id);

        branch.isDelete = true;

        await branch.save();

        res.status(201).json({
            success: true,
            message: req.t('branch.delete')
        });
    } catch (error) {
        console.log(error)
        next(error);
    }
};


exports.addCategory = async (req, res, next) => {
    try {

        await categoryModel.create({
            vendor: req.vendor.id,
            name: req.body.name,
        });

        res.status(201).json({
            success: true,
            message: req.t('cat.add')
        });
    } catch (error) {
        console.log(error)
        next(error);
    }
};

exports.getCategoryList = async (req, res, next) => {
    try {
        
        const categories = await categoryModel.aggregate([
            {
              $match: {
                vendor: mongoose.Types.ObjectId(req.vendor.id),
                isDelete: false,
              },
            },
            {
              $lookup: {
                from: 'menuitems',
                localField: '_id',
                foreignField: 'category',
                as: 'menuItems',
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                itemCount: { $size: '$menuItems' },
              },
            },
        ]);

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: categories,
        });

    } catch (error) {
        next(error);
    }
};

exports.updateCategory = async (req, res, next) => {
    try {
        
        const category = await categoryModel.findById(req.params.id);

        category.name = req.body.name
        
        await category.save();

        res.status(201).json({
            success: true,
            message: req.t('cat.update')
        });
    } catch (error) {
        console.log(error)
        next(error);
    }
};

exports.deleteCategory = async (req, res, next) => {
    try {
        
        await categoryModel.findByIdAndDelete(req.params.id);

        await menuItemModel.deleteMany({ category: mongoose.Types.ObjectId(req.params.id) });

        res.status(201).json({
            success: true,
            message: req.t('cat.delete')
        });
    } catch (error) {
        console.log(error)
        next(error);
    }
};



exports.addItem = async (req, res, next) => {
    try {

        await menuItemModel.create({
            category: req.body.category,
            name: req.body.name,
            price : req.body.price,
            image: req.file ? req.file.filename : '' 
        });

        res.status(201).json({
            success: true,
            message: req.t('item.add')
        });
    } catch (error) {
        console.log(error)
        next(error);
    }
};

exports.getItemList = async (req, res, next) => {
    try {
        
        let items = await menuItemModel.find({category: req.params.id, isDelete:false}).select('name price image isActive');

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: items,
        });

    } catch (error) {
        next(error);
    }
};

exports.updateItem = async (req, res, next) => {
    try {
        
        const menu = await menuItemModel.findById(req.params.id);

        menu.name = req.body.name ? req.body.name : menu.name
        menu.price = req.body.price? req.body.price : menu.price
        menu.isActive = req.body.isActive? req.body.isActive : menu.isActive
        
        if (req.file) {
            if(menu.image != ''){
                const oldImagePath = path.join(
                    __dirname,
                    '../../public/uploads/',
                    menu.image
                );
                fs.unlink(oldImagePath, () => {});    
            }
            
            menu.image = req.file.filename;
        }

        await menu.save();

        res.status(201).json({
            success: true,
            message: req.t('item.update')
        });
    } catch (error) {
        console.log(error)
        next(error);
    }
};

exports.deleteItem = async (req, res, next) => {
    try {
        
        await menuItemModel.findByIdAndDelete(req.params.id);

        res.status(201).json({
            success: true,
            message: req.t('item.delete')
        });
    } catch (error) {
        console.log(error)
        next(error);
    }
};