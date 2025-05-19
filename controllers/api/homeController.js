const createError = require('http-errors');
const mongoose = require('mongoose');
const multilingual = require('../../utils/multilingual');
const businessTypeModel = require('../../models/businessTypeModel');
const branchModel = require('../../models/branchModel');
const vendorModel = require('../../models/vendorModel');
const menuItemModel = require('../../models/menuItemModel');
const bannerModel = require('../../models/bannerModel');
const reviewModel = require('../../models/reviewModel');
const categoryModel = require('../../models/categoryModel');
const wishlistModel = require('../../models/wishlistModel');
const discountModel = require('../../models/discountModel');
const Transaction = require('../../models/transactionModel');
const Staff = require('../../models/staffModel');

exports.dashboardStaff = async (req, res, next) => {
    try {
        const staffId = req.staff.id;

        const result = await Transaction.aggregate([
            {
                $match: {
                    staff: new mongoose.Types.ObjectId(staffId),
                    status: 'accepted',
                },
            },
            {
                $group: {
                    _id: '$staff',
                    assignedPoints: { $sum: '$earnedPoints' },
                    redeemedPoints: { $sum: '$spentPoints' },
                    users: { $addToSet: '$user' }, // collect unique users
                },
            },
            {
                $project: {
                    assignedPoints: 1,
                    redeemedPoints: 1,
                    userCount: { $size: '$users' },
                },
            },
        ]);

        const totalDiscounts = await discountModel.countDocuments({
            vendor: req.staff.vendor,
            adminApprovedStatus: { $nin: ['Pending', 'Rejected'] },
            status: { $nin: ['Inactive', 'Expired'] },
        });

        if (result.length === 0) {
            return res.status(200).json({
                success: true,
                message: req.t('success'),
                assignedPoints: 0,
                redeemedPoints: 0,
                userCount: 0,
                totalDiscounts,
            });
        }

        res.status(200).json({
            success: true,
            message: req.t('success'),
            assignedPoints: result[0].assignedPoints,
            redeemedPoints: result[0].redeemedPoints,
            userCount: result[0].userCount,
            totalDiscounts,
        });
    } catch (error) {
        next(error);
    }
};

exports.getCategoryList = async (req, res, next) => {
    try {
        let category = await businessTypeModel
            .find({ isDelete: false, isActive: true })
            .select('en ar image');
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
        const banners = await bannerModel
            .find()
            .select('image')
            .sort({ sort: 1 });

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: banners,
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.getSearchSuggestion = async (req, res, next) => {
    try {
        const query = req.query.search;

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
            data: suggestions,
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.getRestaurantList = async (req, res, next) => {
    try {
        const {
            latitude,
            longitude,
            categoryId,
            location,
            searchTerm,
            rating,
            sortBy,
        } = req.body;

        // Validate input
        if (!latitude || !longitude) {
            return res
                .status(400)
                .json({ error: 'Latitude and longitude are required' });
        }

        let sortCondition = {};

        if (sortBy === 'high_to_low_rating') {
            sortCondition = { rating: -1 };
        } else if (sortBy === 'low_to_high_rating') {
            sortCondition = { rating: 1 };
        } else if (sortBy === 'nearby') {
            sortCondition = { distance_in_mt: 1 };
        } else {
            sortCondition = { businessName: 1 };
        }

        const branches = await branchModel.aggregate([
            {
                $geoNear: {
                    near: {
                        type: 'Point',
                        coordinates: [
                            parseFloat(longitude),
                            parseFloat(latitude),
                        ],
                    },
                    distanceField: 'distance',
                    maxDistance: location ? location * 1000 : 50000, //Default 50KM
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
                    ...(categoryId && {
                        'vendorDetails.businessType':
                            mongoose.Types.ObjectId(categoryId),
                    }),
                    ...(searchTerm && {
                        $and: [
                            {
                                $or: [
                                    {
                                        'vendorDetails.businessName': {
                                            $regex: searchTerm,
                                            $options: 'i',
                                        },
                                    },
                                    {
                                        'menuItems.name': {
                                            $regex: searchTerm,
                                            $options: 'i',
                                        },
                                    },
                                ],
                            },
                            {
                                $or: [
                                    { menuItems: { $eq: null } }, // Allow vendors with no menu items
                                    { 'menuItems.isActive': true }, // OR menu item must be active
                                ],
                            },
                        ],
                    }),
                    ...(rating && {
                        'vendorDetails.businessRating': {
                            $lte: parseInt(rating),
                        },
                    }),
                },
            },
            {
                $group: {
                    _id: '$vendorDetails._id',
                    businessName: { $first: '$vendorDetails.businessName' },
                    businessLogo: { $first: '$vendorDetails.businessLogo' },
                    rating: { $first: '$vendorDetails.businessRating' },
                    review: { $first: '$vendorDetails.businessReview' },
                    distance_in_mt: { $min: '$distance' },
                    branchId: { $first: '$_id' },
                },
            },
            {
                $sort: sortCondition,
            },
        ]);

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: branches,
        });
    } catch (error) {
        next(error);
    }
};

exports.restaurantDetail = async (req, res, next) => {
    try {
        const vendorId = req.body.vendorId;
        const branchId = req.body.branchId;

        const vendor = await vendorModel
            .findById(vendorId)
            .select(
                'businessName businessLogo businessMobile email businessRating businessReview'
            )
            .lean();

        const branches = await branchModel
            .find({ vendor: vendor._id, isDelete: false })
            .select('-vendor -createdAt -updatedAt -__v -isDelete')
            .lean();

        const isFavourite = await wishlistModel.findOne({
            user: req.user.id,
            vendor: vendorId,
        });

        const selectedBranch = branches.find(
            branch => branch._id.toString() == branchId
        );

        if (selectedBranch) selectedBranch.isSelected = true;

        let categories = await categoryModel
            .find({ vendor: vendor._id, isDelete: false })
            .select('name')
            .lean();

        const offers = await discountModel
            .find({ vendor: vendor._id, adminApprovedStatus: 'Approved' })
            .select(
                'title description customerType totalUserCount expiryDate minBillAmount remainingUserCount'
            )
            .lean();

        const filteredOffers = offers.filter(offer => {
            const [day, month, year] = offer.expiryDate.split('/').map(Number);
            const expiryDate = new Date(year, month - 1, day); // JS Date months are 0-based
            return expiryDate >= new Date();
        });

        let menu = await Promise.all(
            categories.map(async cat => {
                const items = await menuItemModel
                    .find({
                        vendor: vendor._id,
                        category: cat._id,
                        isDelete: false,
                        isActive: true,
                    })
                    .select('name price image')
                    .lean();
                return {
                    category: cat.name,
                    items: items,
                };
            })
        );

        vendor.offers = filteredOffers;
        vendor.branches = branches;
        vendor.menu = menu;
        vendor.isFavourite = isFavourite ? true : false;

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: vendor,
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.postAddFavourite = async (req, res, next) => {
    try {
        const data = await wishlistModel.findOne({
            user: req.user.id,
            vendor: req.params.vendorId,
        });

        if (!data) {
            await wishlistModel.create({
                user: req.user.id,
                vendor: req.params.vendorId,
            });

            res.status(201).json({
                success: true,
                message: req.t('fav.add'),
            });
        } else {
            await wishlistModel.deleteOne({
                user: req.user.id,
                vendor: req.params.vendorId,
            });

            res.status(200).json({
                success: true,
                message: req.t('fav.remove'),
            });
        }
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.getFavouriteList = async (req, res, next) => {
    try {
        const data = await wishlistModel
            .find({ user: req.user.id })
            .select('_id')
            .populate({
                path: 'vendor',
                select: 'businessName businessLogo businessRating businessReview',
            });

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: data,
        });
    } catch (error) {
        console.log(error);
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
            { $group: { _id: '$vendor', avgRating: { $avg: '$rating' } } },
        ]);

        const avgRating =
            avgRatingData.length > 0 ? avgRatingData[0].avgRating : 0;

        // Increment the review count and update the rating
        await vendorModel.findByIdAndUpdate(
            mongoose.Types.ObjectId(req.body.vendorId),
            {
                $set: { businessRating: avgRating.toFixed(1) },
                $inc: { businessReview: 1 },
            }
        );

        res.status(201).json({
            success: true,
            message: req.t('review.add'),
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.getReviews = async (req, res, next) => {
    try {
        const reviews = await reviewModel
            .find({ vendor: req.params.vendorId })
            .select('user rating review createdAt')
            .populate({
                path: 'user',
                select: 'name',
            })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: reviews,
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};
