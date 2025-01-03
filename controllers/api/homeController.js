const createError = require('http-errors');
const mongoose = require('mongoose');
const multilingual = require('../../utils/multilingual');
const businessTypeModel = require('../../models/businessTypeModel');
const branchModel = require('../../models/branchModel');
const vendorModel = require('../../models/vendorModel');
const menuItemModel = require('../../models/menuItemModel');
const bannerModel = require('../../models/bannerModel');
const reviewModel = require('../../models/reviewModel');


exports.getCategoryList = async (req, res, next) => {
    try {

        let category = await businessTypeModel.find({isDelete: false, isActive:true}).select('en ar image');
        category = category.map(x => multilingual(x, req));

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: category,
        });

    } catch (error) {
        next(error);
    }
};

exports.getBannerList = async (req, res, next) => {
    try {

        const banners = await bannerModel.find().select('image').sort({sort: 1})

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: banners
        });

    } catch (error) {
        console.log(error)
        next(error);
    }
};

exports.getSearchSuggestion = async (req, res, next) => {
    try {

        const query = req.query.search

        const vendorResults = await vendorModel.find(
            { businessName: { $regex: query, $options: 'i' } },
            { businessName: 1, _id: 0 }
        );
      
        const menuItemResults = await menuItemModel.find(
            { name: { $regex: query, $options: 'i' } },
            { name: 1, _id: 0 }
        );
    
        // Combine results
        const suggestions = [
            ...vendorResults.map(vendor => ({ name: vendor.businessName })),
            ...menuItemResults.map(item => ({ name: item.name })),
        ];

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: suggestions
        });

    } catch (error) {
        console.log(error)
        next(error);
    }
};

exports.getRestaurantList = async (req, res, next) => {
    try {
        const { latitude, longitude, categoryId, location, searchTerm, rating, sortBy } = req.body;

        // Validate input
        if (!latitude || !longitude) {
          return res.status(400).json({ error: 'Latitude and longitude are required' });
        }

        let sortCondition = {};

        if (sortBy === 'high_to_low_rating') {
            sortCondition = { 'rating': -1 };
        } else if (sortBy === 'low_to_high_rating') {
            sortCondition = { 'rating': 1 };
        } else if(sortBy === 'nearby'){
            sortCondition = { 'distance_in_mt': 1 };
        } else{
            sortCondition = { 'businessName' : 1 }
        }

        const branches = await branchModel.aggregate([
            {
                $geoNear: {
                    near: {
                        type: 'Point',
                        coordinates: [parseFloat(longitude), parseFloat(latitude)],
                    },
                    distanceField: 'distance',
                    maxDistance: location ? location*1000 : 50000, //Default 50KM
                    spherical: true,
                },
            },
            {
                $match: {
                    isDelete: false,
                },
            },
            {
                $lookup: {
                    from: 'vendors',
                    localField: 'vendor',
                    foreignField: '_id',
                    as: 'vendorDetails',
                },
            },
            {
                $unwind: '$vendorDetails',
            },
            {
                $lookup: {
                    from: 'menuitems',
                    localField: 'vendorDetails._id',
                    foreignField: 'vendor',
                    as: 'menuItems',
                },
            },
            {
                $unwind: {
                    path: '$menuItems',
                    preserveNullAndEmptyArrays: true, // In case a vendor has no menuItems
                },
            },
            {
                $match: {
                    'vendorDetails.isDelete': false,
                    'vendorDetails.isActive': true,
                    'vendorDetails.adminApproved': true,
                    ...(categoryId && { 'vendorDetails.businessType': mongoose.Types.ObjectId(categoryId) }),
                    ...(searchTerm && { 
                        $or: [
                            { 'vendorDetails.businessName': { $regex: searchTerm, $options: 'i' } },
                            { 'menuItems.name': { $regex: searchTerm, $options: 'i' } },
                        ]
                    }),
                    ...(searchTerm && { 'menuItems.isActive': true }),
                    ...(rating && { 'vendorDetails.businessRating' : { $lte: parseInt(rating) } }),
                },
            },
            {
                $group: {
                    _id: '$vendorDetails._id', 
                    businessName: { $first: '$vendorDetails.businessName' },
                    businessLogo: { $first: '$vendorDetails.businessLogo' },
                    rating : { $first: '$vendorDetails.businessRating' },
                    review : { $first: '$vendorDetails.businessReview' },
                    distance_in_mt: { $min: '$distance' }, 
                    branchId: { $first: '$_id' },
                },
            },     
            {
                $sort: sortCondition,
            },
        ])

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: branches,
        });

    } catch (error) {
        next(error);
    }
};

exports.postAddReview = async (req, res, next) => {
    try {

        await reviewModel.create({
            user: req.user.id,
            vendor: req.body.vendorId,
            rating: req.body.rating,
            review: req.body.review,
        });

        // Calculate the average rating
        const avgRatingData = await reviewModel.aggregate([
            { $match: { vendor: mongoose.Types.ObjectId(req.body.vendorId) } },
            { $group: { _id: "$vendor", avgRating: { $avg: "$rating" } } },
        ]);

        const avgRating = avgRatingData.length > 0 ? avgRatingData[0].avgRating : 0;

        // Increment the review count and update the rating
        await vendorModel.findByIdAndUpdate(
            mongoose.Types.ObjectId(req.body.vendorId),
            {
                $set: { businessRating: avgRating.toFixed(1) },
                $inc: { businessReview: 1 },
            },       
        );

        res.status(201).json({
            success: true,
            message: req.t('review.add')
        });
    } catch (error) {
        console.log(error)
        next(error);
    }
};


exports.getReviews = async (req, res, next) => {
    try {

        const reviews = await reviewModel.find({vendor: req.params.vendorId}).select('user rating review createdAt')
                            .populate({
                                path: 'user',
                                select : 'name'
                            }).sort({createdAt: -1})

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: reviews
        });

    } catch (error) {
        console.log(error)
        next(error);
    }
};