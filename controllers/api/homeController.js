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
const Branch = require('../../models/branchModel');
const userPoint = require('../../models/userPoint');

// (async () => {
//     try {
//         const customerIdsToAdd = [
//             new mongoose.Types.ObjectId("685e77ef7c201b9149ef5704"),
//             new mongoose.Types.ObjectId("685e78197c201b9149ef572d") // add live id here as per db
//         ];

//         // Step 1: Set customerType to an empty array
//         await discountModel.updateMany({}, { $set: { customerType: [] } });

//         // Step 2: Add the new customerIds using $addToSet
//         const updatedDiscount = await discountModel.updateMany(
//             {},
//             { $addToSet: { customerType: { $each: customerIdsToAdd } } },
//             { new: true }
//         );

//         console.log('Updated Discount:', updatedDiscount);
//     } catch (error) {
//         console.error('Error updating discount:', error);
//     }
// })();

// (async () => {
//     try {

//         const newExpiryDate = "20/10/2025 06:47 PM";

//         const result = await discountModel.updateMany(
//             {},
//             { $set: { expiryDate: newExpiryDate } }
//         );

//         console.log('Expiry date updated for all discounts:', result);
//     } catch (error) {
//         console.error('Error updating expiry date:', error);
//     }
// })();

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

// Use below code when need for only users
// exports.getCategoryList = async (req, res, next) => {
//     try {
//         // Step 1: Get vendor IDs who have at least one non-deleted branch
//         const vendorsWithBranches = await branchModel
//             .find({ isDelete: false })
//             .distinct('vendor');

//         // Step 2: Get businessType (category) IDs used by those vendors
//         const usedCategoryIds = await vendorModel
//             .find({
//                 _id: { $in: vendorsWithBranches },
//                 isActive: true,
//                 isDelete: false,
//             })
//             .distinct('businessType');

//         // Step 3: Get businessType categories based on those IDs
//         let categories = await businessTypeModel
//             .find({
//                 _id: { $in: usedCategoryIds },
//                 isDelete: false,
//                 isActive: true,
//             })
//             .select('en ar image');

//         // Step 4: Map to multilingual
//         categories = categories.map(x => multilingual(x, req));

//         res.status(200).json({
//             success: true,
//             message: req.t('success'),
//             data: categories,
//         });
//     } catch (error) {
//         next(error);
//     }
// };

// exports.getCategoryList = async (req, res, next) => {
//     try {
//         if (!req.vendor?.id) {
//             // Step 1: Get vendor IDs who have at least one non-deleted branch
//             const vendorsWithBranches = await branchModel
//                 .find({ isDelete: false })
//                 .distinct('vendor');

//             // Step 2: Get businessType (category) IDs used by those vendors
//             const usedCategoryIds = await vendorModel
//                 .find({
//                     _id: { $in: vendorsWithBranches },
//                     isActive: true,
//                     isDelete: false,
//                 })
//                 .distinct('businessType');

//             // Step 3: Get businessType categories based on those IDs
//             let categories = await businessTypeModel
//                 .find({
//                     _id: { $in: usedCategoryIds },
//                     isDelete: false,
//                     isActive: true,
//                 })
//                 .select('en ar image');

//             // Step 4: Map to multilingual
//             categories = categories.map(x => multilingual(x, req));

//             return res.status(200).json({
//                 success: true,
//                 message: req.t('success'),
//                 data: categories,
//             });
//         } else {
//             let categories = await businessTypeModel
//                 .find({
//                     isDelete: false,
//                     isActive: true,
//                 })
//                 .select('en ar image');

//             // Step 4: Map to multilingual
//             categories = categories.map(x => multilingual(x, req));

//             res.status(200).json({
//                 success: true,
//                 message: req.t('success'),
//                 data: categories,
//             });
//         }
//     } catch (error) {
//         next(error);
//     }
// };

//////////////////lat log updated
// exports.getCategoryList = async (req, res, next) => {
//     try {
//         const { latitude, longitude } = req.body; // Same as restaurant list

//         let categories;

//         // Agar vendor logged in hai (admin/vendor panel), toh saari categories dikhao (location ignore)
//         if (req.vendor?.id) {
//             categories = await businessTypeModel
//                 .find({
//                     isDelete: false,
//                     isActive: true,
//                 })
//                 .select('en ar image');

//             categories = categories.map(x => multilingual(x, req));

//             return res.status(200).json({
//                 success: true,
//                 message: req.t('success'),
//                 data: categories,
//             });
//         }

//         // Normal user ke liye: location-based filtering
//         let matchCondition = {
//             isDelete: false,
//             isActive: true,
//         };

//         if (latitude && longitude) {
//             const maxDistance = 50000; // 50 KM (same default as restaurant list)

//             const pipeline = [
//                 {
//                     $geoNear: {
//                         near: {
//                             type: 'Point',
//                             coordinates: [parseFloat(longitude), parseFloat(latitude)],
//                         },
//                         distanceField: 'distance',
//                         maxDistance: maxDistance,
//                         spherical: true,
//                     },
//                 },
//                 { $match: { isDelete: false } },
//                 {
//                     $lookup: {
//                         from: 'vendors',
//                         localField: 'vendor',
//                         foreignField: '_id',
//                         as: 'vendorDetails',
//                     },
//                 },
//                 { $unwind: '$vendorDetails' },
//                 {
//                     $match: {
//                         'vendorDetails.isDelete': false,
//                         'vendorDetails.isActive': true,
//                         'vendorDetails.adminApproved': true,
//                     },
//                 },
//                 {
//                     $group: {
//                         _id: '$vendorDetails.businessType', // Category ID
//                     },
//                 },
//                 { $match: { _id: { $ne: null } } },
//             ];

//             const result = await branchModel.aggregate(pipeline);
//             const availableCategoryIds = result.map(item => item._id);

//             if (availableCategoryIds.length === 0) {
//                 return res.status(200).json({
//                     success: true,
//                     message: req.t('success'),
//                     data: [],
//                 });
//             }

//             matchCondition._id = { $in: availableCategoryIds };
//         }
//         // Agar lat/long nahi diye toh saari active categories dikhao (fallback)

//         categories = await businessTypeModel
//             .find(matchCondition)
//             .select('en ar image')
//             .sort({ 'en.name': 1 }); // Optional: alphabetical sort

//         categories = categories.map(x => multilingual(x, req));

//         res.status(200).json({
//             success: true,
//             message: req.t('success'),
//             data: categories,
//         });
//     } catch (error) {
//         next(error);
//     }
// };

exports.getCategoryList = async (req, res, next) => {
    try {
        const { latitude, longitude } = req.body;

        // ── Vendor/Admin logged in → show ALL active categories (ignore location)
        if (req.vendor?.id) {
            let categories = await businessTypeModel
                .find({
                    isDelete: false,
                    isActive: true,
                })
                .select('en ar image')
                .sort({ 'en.name': 1 }); // optional: alphabetical

            categories = categories.map(x => multilingual(x, req));

            return res.status(200).json({
                success: true,
                message: req.t('success'),
                data: categories,
            });
        }

        // ── Normal user ────────────────────────────────────────────────

        let matchCondition = {
            isDelete: false,
            isActive: true,
        };

        let categories;

        // Case 1: Latitude + Longitude provided → use geo-based nearby filtering
        if (latitude && longitude) {
            const maxDistance = 50000; // 50 km

            const pipeline = [
                {
                    $geoNear: {
                        near: {
                            type: 'Point',
                            coordinates: [parseFloat(longitude), parseFloat(latitude)],
                        },
                        distanceField: 'distance',
                        maxDistance: maxDistance,
                        spherical: true,
                    },
                },
                { $match: { isDelete: false } },
                {
                    $lookup: {
                        from: 'vendors',
                        localField: 'vendor',
                        foreignField: '_id',
                        as: 'vendorDetails',
                    },
                },
                { $unwind: '$vendorDetails' },
                {
                    $match: {
                        'vendorDetails.isDelete': false,
                        'vendorDetails.isActive': true,
                        'vendorDetails.adminApproved': true,
                    },
                },
                {
                    $group: {
                        _id: '$vendorDetails.businessType', // category ID
                    },
                },
                { $match: { _id: { $ne: null } } },
            ];

            const result = await branchModel.aggregate(pipeline);
            const availableCategoryIds = result.map(item => item._id);

            if (availableCategoryIds.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: req.t('success'),
                    data: [],
                });
            }

            matchCondition._id = { $in: availableCategoryIds };
        }
        // Case 2: No lat/long → fallback to "only categories that have at least one valid vendor/branch"
        else {
            // Get vendors who have at least one non-deleted branch
            const vendorsWithBranches = await branchModel
                .find({ isDelete: false })
                .distinct('vendor');

            // Get businessTypes used by those active + approved vendors
            const usedCategoryIds = await vendorModel
                .find({
                    _id: { $in: vendorsWithBranches },
                    isActive: true,
                    isDelete: false,
                    adminApproved: true,          // ← important: added this (was missing in your 2nd code)
                })
                .distinct('businessType');

            if (usedCategoryIds.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: req.t('success'),
                    data: [],
                });
            }

            matchCondition._id = { $in: usedCategoryIds };
        }

        // Final query — common for both user cases (with or without location)
        categories = await businessTypeModel
            .find(matchCondition)
            .select('en ar image')
            .sort({ 'en.name': 1 });

        categories = categories.map(x => multilingual(x, req));

        return res.status(200).json({
            success: true,
            message: req.t('success'),
            data: categories,
        });
    } catch (error) {
        next(error);
    }
};

exports.getCategoryListVendor = async (req, res, next) => {
    try {
        let categories = await businessTypeModel
            .find({
                isDelete: false,
                isActive: true,
            })
            .select('en ar image');

        // Step 4: Map to multilingual
        categories = categories.map(x => multilingual(x, req));

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: categories,
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



// exports.getRestaurantList = async (req, res, next) => {
//     try {
//         const {
//             latitude,
//             longitude,
//             categoryId,
//             location,
//             searchTerm,
//             rating,
//             sortBy,
//         } = req.body;

//         const showPopular = req.body.includePopular === true || req.body.includePopular === 'true' || req.query.popularitem === 'true';
//         const showLiked = req.body.includeLiked === true || req.body.includeLiked === 'true' || req.query.likeditem === 'true';

//         let categoryIds = [];
//         if (categoryId) {
//             if (typeof categoryId === 'string') {
//                 try {
//                     const parsed = JSON.parse(categoryId);
//                     categoryIds = Array.isArray(parsed) ? parsed : [categoryId];
//                 } catch (err) {
//                     categoryIds = [categoryId];
//                 }
//             } else if (Array.isArray(categoryId)) {
//                 categoryIds = categoryId;
//             } else {
//                 categoryIds = [categoryId];
//             }
//         }

//         let sortCondition = {};
//         if (sortBy === 'high_to_low_rating') {
//             sortCondition = { rating: -1 };
//         } else if (sortBy === 'low_to_high_rating') {
//             sortCondition = { rating: 1 };
//         } else if (sortBy === 'nearby') {
//             sortCondition = { distance_in_mt: 1 };
//         } else {
//             sortCondition = { businessName: 1 };
//         }

//         let pipeline = [];
//         const includeGeo = sortBy !== 'all';

//         if (includeGeo) {
//             if (!latitude || !longitude) {
//                 return res.status(400).json({
//                     success: false,
//                     message: 'Latitude and longitude are required for this sortBy option',
//                 });
//             }
//             pipeline.push({
//                 $geoNear: {
//                     near: {
//                         type: 'Point',
//                         coordinates: [parseFloat(longitude), parseFloat(latitude)],
//                     },
//                     distanceField: 'distance',
//                     maxDistance: location ? location * 1000 : 50000, // default 50km
//                     spherical: true,
//                 },
//             });
//         }

//         pipeline = pipeline.concat([
//             { $match: { isDelete: false } },
//             {
//                 $lookup: {
//                     from: 'vendors',
//                     localField: 'vendor',
//                     foreignField: '_id',
//                     as: 'vendorDetails',
//                 },
//             },
//             { $unwind: '$vendorDetails' },
//             {
//                 $match: {
//                     'vendorDetails.isDelete': false,
//                     'vendorDetails.isActive': true,
//                     'vendorDetails.adminApproved': true,
//                     ...(categoryIds?.length && {
//                         'vendorDetails.businessType': {
//                             $in: categoryIds.map(id => mongoose.Types.ObjectId(id)),
//                         },
//                     }),
//                     // ✅ FIX: $eq + parseFloat — exact match, decimals bhi support
//                     // ❌ Old: $lte + parseInt — sab lower ratings aa jaate the
//                     ...(rating && {
//                         'vendorDetails.businessRating': { $eq: parseFloat(rating) },
//                     }),
//                 },
//             },
//         ]);

//         if (searchTerm) {
//             pipeline = pipeline.concat([
//                 {
//                     $lookup: {
//                         from: 'menuitems',
//                         localField: 'vendorDetails._id',
//                         foreignField: 'vendor',
//                         as: 'menuItems',
//                     },
//                 },
//                 { $unwind: { path: '$menuItems', preserveNullAndEmptyArrays: true } },
//                 {
//                     $match: {
//                         $and: [
//                             {
//                                 $or: [
//                                     { 'vendorDetails.businessName': { $regex: searchTerm, $options: 'i' } },
//                                     { 'menuItems.name': { $regex: searchTerm, $options: 'i' } },
//                                 ],
//                             },
//                             {
//                                 $or: [
//                                     { menuItems: { $eq: null } },
//                                     { 'menuItems.isActive': true },
//                                 ],
//                             },
//                         ],
//                     },
//                 },
//             ]);
//         }

//         pipeline.push({
//             $group: {
//                 _id: '$vendorDetails._id',
//                 businessName: { $first: '$vendorDetails.businessName' },
//                 businessLogo: { $first: '$vendorDetails.businessLogo' },
//                 rating: { $first: '$vendorDetails.businessRating' },
//                 review: { $first: '$vendorDetails.businessReview' },
//                 distance_in_mt: { $min: { $ifNull: ['$distance', 0] } },
//                 branchId: { $first: '$_id' },
//                 branches: {
//                     $addToSet: {
//                         _id: '$_id',
//                         buildingName: '$buildingName',
//                         roadName: '$roadName',
//                         city: '$city',
//                         country: '$country',
//                         state: '$state',
//                         location: '$location',
//                         buildingNo: '$buildingNo',
//                         isSelected: '$isSelected',
//                     },
//                 },
//             },
//         });

//         pipeline.push({
//             $match: {
//                 businessName: { $ne: null },
//                 businessLogo: { $ne: null },
//             },
//         });

//         if (showPopular) {
//             pipeline.push({
//                 $lookup: {
//                     from: 'transactions',
//                     let: { vendorId: '$_id' },
//                     pipeline: [
//                         { $match: { $expr: { $eq: ['$vendor', '$$vendorId'] }, status: 'accepted' } },
//                         { $unwind: '$items' },
//                         { $group: { _id: '$items.menuItem', totalSold: { $sum: '$items.quantity' } } },
//                         { $match: { totalSold: { $gt: 0 } } },
//                         { $sort: { totalSold: -1 } },
//                         { $limit: 5 },
//                         { $lookup: { from: 'menuitems', localField: '_id', foreignField: '_id', as: 'menuItemDetails' } },
//                         { $unwind: { path: '$menuItemDetails', preserveNullAndEmptyArrays: false } },
//                         { $match: { 'menuItemDetails.isActive': true, 'menuItemDetails.isDelete': false } },
//                         { $project: { _id: 0, menuItemId: '$menuItemDetails._id', name: '$menuItemDetails.name', price: { $ifNull: ['$menuItemDetails.price', 0] }, image: '$menuItemDetails.image', totalSold: 1 } },
//                     ],
//                     as: 'mostPopularItems',
//                 },
//             });
//             pipeline.push({ $match: { 'mostPopularItems.0': { $exists: true } } });
//         }

//         if (showLiked) {
//             pipeline.push({
//                 $lookup: {
//                     from: 'favoriteitems',
//                     let: { vendorId: '$_id' },
//                     pipeline: [
//                         { $lookup: { from: 'menuitems', localField: 'menuItem', foreignField: '_id', as: 'menuItemDetails' } },
//                         { $unwind: { path: '$menuItemDetails', preserveNullAndEmptyArrays: false } },
//                         { $match: { $expr: { $eq: ['$menuItemDetails.vendor', '$$vendorId'] }, 'menuItemDetails.isActive': true, 'menuItemDetails.isDelete': false } },
//                         { $group: { _id: '$menuItem', name: { $first: '$menuItemDetails.name' }, price: { $first: { $ifNull: ['$menuItemDetails.price', 0] } }, image: { $first: '$menuItemDetails.image' }, likeCount: { $sum: 1 } } },
//                         { $match: { likeCount: { $gt: 0 } } },
//                         { $sort: { likeCount: -1 } },
//                         { $limit: 5 },
//                         { $project: { _id: 0, menuItemId: '$_id', name: 1, price: 1, image: 1, likeCount: 1 } },
//                     ],
//                     as: 'mostLikedItems',
//                 },
//             });
//             pipeline.push({ $match: { 'mostLikedItems.0': { $exists: true } } });
//         }

//         pipeline.push({ $sort: sortCondition });

//         const vendors = await branchModel.aggregate(pipeline);

//         res.status(200).json({
//             success: true,
//             message: req.t('success'),
//             data: vendors,
//         });

//     } catch (error) {
//         console.error('getRestaurantList error:', error);
//         next(error);
//     }
// };

// exports.getRestaurantList = async (req, res, next) => {
//     try {
//         const {
//             latitude,
//             longitude,
//             categoryId,
//             location,
//             searchTerm,
//             rating,
//             sortBy,
//         } = req.body;

//         // ✅ DEBUG LOGS — remove after fixing
//         console.log('=== getRestaurantList DEBUG ===');
//         console.log('latitude:', latitude, '| longitude:', longitude);
//         console.log('rating:', rating, '| type:', typeof rating);
//         console.log('sortBy:', sortBy);
//         console.log('location:', location);
//         console.log('===============================');

//         const showPopular = req.body.includePopular === true || req.body.includePopular === 'true' || req.query.popularitem === 'true';
//         const showLiked = req.body.includeLiked === true || req.body.includeLiked === 'true' || req.query.likeditem === 'true';

//         let categoryIds = [];
//         if (categoryId) {
//             if (typeof categoryId === 'string') {
//                 try {
//                     const parsed = JSON.parse(categoryId);
//                     categoryIds = Array.isArray(parsed) ? parsed : [categoryId];
//                 } catch (err) {
//                     categoryIds = [categoryId];
//                 }
//             } else if (Array.isArray(categoryId)) {
//                 categoryIds = categoryId;
//             } else {
//                 categoryIds = [categoryId];
//             }
//         }

//         let sortCondition = {};
//         if (sortBy === 'high_to_low_rating') {
//             sortCondition = { rating: -1 };
//         } else if (sortBy === 'low_to_high_rating') {
//             sortCondition = { rating: 1 };
//         } else if (sortBy === 'nearby') {
//             sortCondition = { distance_in_mt: 1 };
//         } else {
//             sortCondition = { businessName: 1 };
//         }

//         const hasLatLng =
//             latitude !== undefined && latitude !== null && latitude !== '' &&
//             longitude !== undefined && longitude !== null && longitude !== '';

//         let pipeline = [];

//         // ✅ geoNear sirf tab jab lat/lng diya ho
//         if (hasLatLng) {
//             pipeline.push({
//                 $geoNear: {
//                     near: {
//                         type: 'Point',
//                         coordinates: [parseFloat(longitude), parseFloat(latitude)],
//                     },
//                     distanceField: 'distance',
//                     maxDistance: location ? parseFloat(location) * 1000 : 50000, // default 50km
//                     spherical: true,
//                 },
//             });
//         }

//         // ✅ rating sanitize
//         const sanitizedRating = rating !== undefined && rating !== null && rating !== '' ? parseFloat(rating) : null;
//         console.log('sanitizedRating:', sanitizedRating, '| hasLatLng:', hasLatLng);

//         pipeline = pipeline.concat([
//             { $match: { isDelete: false } },
//             {
//                 $lookup: {
//                     from: 'vendors',
//                     localField: 'vendor',
//                     foreignField: '_id',
//                     as: 'vendorDetails',
//                 },
//             },
//             { $unwind: '$vendorDetails' },
//             {
//                 $match: {
//                     'vendorDetails.isDelete': false,
//                     'vendorDetails.isActive': true,
//                     'vendorDetails.adminApproved': true,
//                     ...(categoryIds?.length && {
//                         'vendorDetails.businessType': {
//                             $in: categoryIds.map(id => mongoose.Types.ObjectId(id)),
//                         },
//                     }),
//                     // ✅ rating filter — exact match with parseFloat
//                     ...(sanitizedRating !== null && {
//                         'vendorDetails.businessRating': { $eq: sanitizedRating },
//                     }),
//                 },
//             },
//         ]);

//         if (searchTerm) {
//             pipeline = pipeline.concat([
//                 {
//                     $lookup: {
//                         from: 'menuitems',
//                         localField: 'vendorDetails._id',
//                         foreignField: 'vendor',
//                         as: 'menuItems',
//                     },
//                 },
//                 { $unwind: { path: '$menuItems', preserveNullAndEmptyArrays: true } },
//                 {
//                     $match: {
//                         $and: [
//                             {
//                                 $or: [
//                                     { 'vendorDetails.businessName': { $regex: searchTerm, $options: 'i' } },
//                                     { 'menuItems.name': { $regex: searchTerm, $options: 'i' } },
//                                 ],
//                             },
//                             {
//                                 $or: [
//                                     { menuItems: { $eq: null } },
//                                     { 'menuItems.isActive': true },
//                                 ],
//                             },
//                         ],
//                     },
//                 },
//             ]);
//         }

//         pipeline.push({
//             $group: {
//                 _id: '$vendorDetails._id',
//                 businessName: { $first: '$vendorDetails.businessName' },
//                 businessLogo: { $first: '$vendorDetails.businessLogo' },
//                 rating: { $first: '$vendorDetails.businessRating' },
//                 review: { $first: '$vendorDetails.businessReview' },
//                 distance_in_mt: { $min: { $ifNull: ['$distance', null] } },
//                 branchId: { $first: '$_id' },
//                 branches: {
//                     $addToSet: {
//                         _id: '$_id',
//                         buildingName: '$buildingName',
//                         roadName: '$roadName',
//                         city: '$city',
//                         country: '$country',
//                         state: '$state',
//                         location: '$location',
//                         buildingNo: '$buildingNo',
//                         isSelected: '$isSelected',
//                     },
//                 },
//             },
//         });

//         pipeline.push({
//             $match: {
//                 businessName: { $ne: null },
//                 businessLogo: { $ne: null },
//             },
//         });

//         if (showPopular) {
//             pipeline.push({
//                 $lookup: {
//                     from: 'transactions',
//                     let: { vendorId: '$_id' },
//                     pipeline: [
//                         { $match: { $expr: { $eq: ['$vendor', '$$vendorId'] }, status: 'accepted' } },
//                         { $unwind: '$items' },
//                         { $group: { _id: '$items.menuItem', totalSold: { $sum: '$items.quantity' } } },
//                         { $match: { totalSold: { $gt: 0 } } },
//                         { $sort: { totalSold: -1 } },
//                         { $limit: 5 },
//                         { $lookup: { from: 'menuitems', localField: '_id', foreignField: '_id', as: 'menuItemDetails' } },
//                         { $unwind: { path: '$menuItemDetails', preserveNullAndEmptyArrays: false } },
//                         { $match: { 'menuItemDetails.isActive': true, 'menuItemDetails.isDelete': false } },
//                         { $project: { _id: 0, menuItemId: '$menuItemDetails._id', name: '$menuItemDetails.name', price: { $ifNull: ['$menuItemDetails.price', 0] }, image: '$menuItemDetails.image', totalSold: 1 } },
//                     ],
//                     as: 'mostPopularItems',
//                 },
//             });
//             pipeline.push({ $match: { 'mostPopularItems.0': { $exists: true } } });
//         }

//         if (showLiked) {
//             pipeline.push({
//                 $lookup: {
//                     from: 'favoriteitems',
//                     let: { vendorId: '$_id' },
//                     pipeline: [
//                         { $lookup: { from: 'menuitems', localField: 'menuItem', foreignField: '_id', as: 'menuItemDetails' } },
//                         { $unwind: { path: '$menuItemDetails', preserveNullAndEmptyArrays: false } },
//                         { $match: { $expr: { $eq: ['$menuItemDetails.vendor', '$$vendorId'] }, 'menuItemDetails.isActive': true, 'menuItemDetails.isDelete': false } },
//                         { $group: { _id: '$menuItem', name: { $first: '$menuItemDetails.name' }, price: { $first: { $ifNull: ['$menuItemDetails.price', 0] } }, image: { $first: '$menuItemDetails.image' }, likeCount: { $sum: 1 } } },
//                         { $match: { likeCount: { $gt: 0 } } },
//                         { $sort: { likeCount: -1 } },
//                         { $limit: 5 },
//                         { $project: { _id: 0, menuItemId: '$_id', name: 1, price: 1, image: 1, likeCount: 1 } },
//                     ],
//                     as: 'mostLikedItems',
//                 },
//             });
//             pipeline.push({ $match: { 'mostLikedItems.0': { $exists: true } } });
//         }

//         pipeline.push({ $sort: sortCondition });

//         const vendors = await branchModel.aggregate(pipeline);

//         console.log('Total vendors found:', vendors.length);
//         if (vendors.length > 0) {
//             console.log('First vendor rating:', vendors[0].rating, '| distance:', vendors[0].distance_in_mt);
//         }

//         res.status(200).json({
//             success: true,
//             message: req.t('success'),
//             data: vendors,
//         });

//     } catch (error) {
//         console.error('getRestaurantList error:', error);
//         next(error);
//     }
// };

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

        // ✅ DEBUG LOGS — remove after fixing
        console.log('=== getRestaurantList DEBUG ===');
        console.log('latitude:', latitude, '| longitude:', longitude);
        console.log('rating:', rating, '| type:', typeof rating);
        console.log('sortBy:', sortBy);
        console.log('location:', location);
        console.log('===============================');

        const showPopular = req.body.includePopular === true || req.body.includePopular === 'true' || req.query.popularitem === 'true';
        const showLiked = req.body.includeLiked === true || req.body.includeLiked === 'true' || req.query.likeditem === 'true';

        let categoryIds = [];
        if (categoryId) {
            if (typeof categoryId === 'string') {
                try {
                    const parsed = JSON.parse(categoryId);
                    categoryIds = Array.isArray(parsed) ? parsed : [categoryId];
                } catch (err) {
                    categoryIds = [categoryId];
                }
            } else if (Array.isArray(categoryId)) {
                categoryIds = categoryId;
            } else {
                categoryIds = [categoryId];
            }
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

        const hasLatLng =
            latitude !== undefined && latitude !== null && latitude !== '' &&
            longitude !== undefined && longitude !== null && longitude !== '';

        let pipeline = [];

        // ✅ geoNear sirf tab jab lat/lng diya ho
        if (hasLatLng) {
            pipeline.push({
                $geoNear: {
                    near: {
                        type: 'Point',
                        coordinates: [parseFloat(longitude), parseFloat(latitude)],
                    },
                    distanceField: 'distance',
                    maxDistance: location ? parseFloat(location) * 1000 : 50000, // default 50km
                    spherical: true,
                },
            });
        }

        // ✅ rating sanitize
        const sanitizedRating = rating !== undefined && rating !== null && rating !== '' ? parseFloat(rating) : null;
        console.log('sanitizedRating:', sanitizedRating, '| hasLatLng:', hasLatLng);

        pipeline = pipeline.concat([
            { $match: { isDelete: false } },
            {
                $lookup: {
                    from: 'vendors',
                    localField: 'vendor',
                    foreignField: '_id',
                    as: 'vendorDetails',
                },
            },
            { $unwind: '$vendorDetails' },
            {
                $match: {
                    'vendorDetails.isDelete': false,
                    'vendorDetails.isActive': true,
                    'vendorDetails.adminApproved': true,
                    ...(categoryIds?.length && {
                        'vendorDetails.businessType': {
                            $in: categoryIds.map(id => mongoose.Types.ObjectId(id)),
                        },
                    }),
                    // ✅ rating filter — ceil based range match
                    // e.g. client ne 2 diya → 1.01 to 2.00 wale sab aayenge
                    // kyunki Math.ceil(1.4) = 2, Math.ceil(2.0) = 2
                    ...(sanitizedRating !== null && {
                        'vendorDetails.businessRating': {
                            $gt: sanitizedRating - 1,  // > 1 (i.e. 1.01+)
                            $lte: sanitizedRating,      // <= 2
                        },
                    }),
                },
            },
        ]);

        if (searchTerm) {
            pipeline = pipeline.concat([
                {
                    $lookup: {
                        from: 'menuitems',
                        localField: 'vendorDetails._id',
                        foreignField: 'vendor',
                        as: 'menuItems',
                    },
                },
                { $unwind: { path: '$menuItems', preserveNullAndEmptyArrays: true } },
                {
                    $match: {
                        $and: [
                            {
                                $or: [
                                    { 'vendorDetails.businessName': { $regex: searchTerm, $options: 'i' } },
                                    { 'menuItems.name': { $regex: searchTerm, $options: 'i' } },
                                ],
                            },
                            {
                                $or: [
                                    { menuItems: { $eq: null } },
                                    { 'menuItems.isActive': true },
                                ],
                            },
                        ],
                    },
                },
            ]);
        }

        pipeline.push({
            $group: {
                _id: '$vendorDetails._id',
                businessName: { $first: '$vendorDetails.businessName' },
                businessLogo: { $first: '$vendorDetails.businessLogo' },
                rating: { $first: '$vendorDetails.businessRating' },
                review: { $first: '$vendorDetails.businessReview' },
                distance_in_mt: { $min: { $ifNull: ['$distance', null] } },
                branchId: { $first: '$_id' },
                branches: {
                    $addToSet: {
                        _id: '$_id',
                        buildingName: '$buildingName',
                        roadName: '$roadName',
                        city: '$city',
                        country: '$country',
                        state: '$state',
                        location: '$location',
                        buildingNo: '$buildingNo',
                        isSelected: '$isSelected',
                    },
                },
            },
        });

        pipeline.push({
            $match: {
                businessName: { $ne: null },
                businessLogo: { $ne: null },
            },
        });

        if (showPopular) {
            pipeline.push({
                $lookup: {
                    from: 'transactions',
                    let: { vendorId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$vendor', '$$vendorId'] }, status: 'accepted' } },
                        { $unwind: '$items' },
                        { $group: { _id: '$items.menuItem', totalSold: { $sum: '$items.quantity' } } },
                        { $match: { totalSold: { $gt: 0 } } },
                        { $sort: { totalSold: -1 } },
                        { $limit: 5 },
                        { $lookup: { from: 'menuitems', localField: '_id', foreignField: '_id', as: 'menuItemDetails' } },
                        { $unwind: { path: '$menuItemDetails', preserveNullAndEmptyArrays: false } },
                        { $match: { 'menuItemDetails.isActive': true, 'menuItemDetails.isDelete': false } },
                        { $project: { _id: 0, menuItemId: '$menuItemDetails._id', name: '$menuItemDetails.name', price: { $ifNull: ['$menuItemDetails.price', 0] }, image: '$menuItemDetails.image', totalSold: 1 } },
                    ],
                    as: 'mostPopularItems',
                },
            });
            pipeline.push({ $match: { 'mostPopularItems.0': { $exists: true } } });
        }

        if (showLiked) {
            pipeline.push({
                $lookup: {
                    from: 'favoriteitems',
                    let: { vendorId: '$_id' },
                    pipeline: [
                        { $lookup: { from: 'menuitems', localField: 'menuItem', foreignField: '_id', as: 'menuItemDetails' } },
                        { $unwind: { path: '$menuItemDetails', preserveNullAndEmptyArrays: false } },
                        { $match: { $expr: { $eq: ['$menuItemDetails.vendor', '$$vendorId'] }, 'menuItemDetails.isActive': true, 'menuItemDetails.isDelete': false } },
                        { $group: { _id: '$menuItem', name: { $first: '$menuItemDetails.name' }, price: { $first: { $ifNull: ['$menuItemDetails.price', 0] } }, image: { $first: '$menuItemDetails.image' }, likeCount: { $sum: 1 } } },
                        { $match: { likeCount: { $gt: 0 } } },
                        { $sort: { likeCount: -1 } },
                        { $limit: 5 },
                        { $project: { _id: 0, menuItemId: '$_id', name: 1, price: 1, image: 1, likeCount: 1 } },
                    ],
                    as: 'mostLikedItems',
                },
            });
            pipeline.push({ $match: { 'mostLikedItems.0': { $exists: true } } });
        }

        pipeline.push({ $sort: sortCondition });

        const vendors = await branchModel.aggregate(pipeline);

        console.log('Total vendors found:', vendors.length);
        if (vendors.length > 0) {
            console.log('First vendor rating:', vendors[0].rating, '| distance:', vendors[0].distance_in_mt);
        }

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: vendors,
        });

    } catch (error) {
        console.error('getRestaurantList error:', error);
        next(error);
    }
};

exports.restaurantDetail = async (req, res, next) => {
    try {
        if (!req.body.time) {
            return next(createError.Unauthorized('Please enter time'));
        }
        const vendorId = req.body.vendorId;
        const branchId = req.body.branchId;

        const vendor = await vendorModel
            .findById(vendorId)
            .select(
                'businessName businessLogo businessMobile email businessRating businessReview'
            )
            .lean();

        let userSpecificP = await userPoint.findOne({
            user: req.user.id,
            vendor: vendorId,
        });

        //   let userSpecificP = await userPoint.find({
        //       user: req.user.id,
        //     //   vendor: vendorId,
        //   });

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
            .populate({
                path: 'customerType',
                select: 'name',
            })
            .select(
                'title discountValue description customerType totalUserCount expiryDate minBillAmount remainingUserCount adminApprovedStatus'
            )
            .lean();

        // const filteredOffers = offers.filter(offer => {
        //     console.log(offer)
        //     const [day, month, year] = offer.expiryDate.split('/').map(Number);
        //     const expiryDate = new Date(year, month - 1, day); // JS Date months are 0-based
        //     return expiryDate >= new Date();
        // });
        // const filteredOffers = offers.filter(offer => {

        //     // Extract only the date and time string
        //     const [datePart, timePart, meridian] = offer.expiryDate.split(/[\s:]+/); // Split by space and colon
        //     const [day, month, year] = datePart.split('/').map(Number);
        //     let hour = parseInt(timePart, 10);
        //     const minute = parseInt(offer.expiryDate.split(':')[1], 10);

        //     // Adjust hour for AM/PM
        //     if (meridian === 'PM' && hour !== 12) {
        //         hour += 12;
        //     } else if (meridian === 'AM' && hour === 12) {
        //         hour = 0;
        //     }

        //     // Create expiry Date object
        //     const expiryDate = new Date(year, month - 1, day, hour, minute);

        //     return expiryDate >= new Date();
        // });

        const filteredOffers = offers.filter(offer => {
            const expiryStr = offer.expiryDate.trim();
            let expiryDate;

            if (/am|pm/i.test(expiryStr)) {
                const [datePart, hourStr, minuteStr, meridian] =
                    expiryStr.split(/[\s:]+/);
                const [day, month, year] = datePart.split('/').map(Number);
                let hour = parseInt(hourStr, 10);
                const minute = parseInt(minuteStr, 10);

                if (meridian.toUpperCase() === 'PM' && hour !== 12) hour += 12;
                if (meridian.toUpperCase() === 'AM' && hour === 12) hour = 0;

                expiryDate = new Date(year, month - 1, day, hour, minute);
            } else {
                const [day, month, year] = expiryStr.split('/').map(Number);
                expiryDate = new Date(year, month - 1, day, 23, 59, 59); // End of day
            }
            const now = new Date(req.body.time);

            return expiryDate >= now;
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
        // vendor.totalPoints = userSpecificP ? userSpecificP.totalPoints : 0;
        vendor.totalPoints = userSpecificP ? Math.max(0, userSpecificP.totalPoints) : 0;

        // console.log('userSpecificP: ', userSpecificP);
        // console.log('vendor.totalPoints: ', vendor.totalPoints);
        // console.log('vendor: ', vendor);

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
        const wishlist = await wishlistModel
            .find({ user: req.user.id })
            .select('_id')
            .populate({
                path: 'vendor',
                select: 'businessName businessLogo businessRating businessReview',
            });

        const enrichedData = await Promise.all(
            wishlist.map(async item => {
                const itemObj = item.toObject();
                const branch = await Branch.findOne({
                    vendor: itemObj.vendor._id,
                    isDelete: false,
                }).select('_id');

                if (itemObj.vendor) {
                    itemObj.vendor.branchId = branch ? branch._id : null;
                }

                return itemObj;
            })
        );

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: enrichedData,
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
