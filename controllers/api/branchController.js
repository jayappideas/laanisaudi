const createError = require('http-errors');
const Branch = require('../../models/branchModel');


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
