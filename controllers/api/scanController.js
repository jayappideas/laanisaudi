const createError = require('http-errors');
const userModel = require('../../models/userModel');
const categoryModel = require('../../models/categoryModel');
const menuItemModel = require('../../models/menuItemModel');
const cartModel = require('../../models/cartModel');
const discountModel = require('../../models/discountModel');
const transactionModel = require('../../models/transactionModel');
const userPoint = require('../../models/userPoint');
const User = require('../../models/userModel');
const {
    sendNotificationsToTokenscheckout,
} = require('../../utils/sendNotificationStaff');
const VendorActivityLog = require('../../models/vendorActivityLog');
const userNotificationModel = require('../../models/userNotificationModel');
const staffNotificationModel = require('../../models/staffNotificationModel');
const vendorNotificationModel = require('../../models/vendorNotificationModel');
const PointsHistory = require('../../models/PointsHistory');
const generateCode = require('../../utils/generateCode');
const moment = require('moment');

exports.scanQr = async (req, res, next) => {
    try {
        const userId = req.body.qrId;
        const vendor = req.body.vendor;

        let user = await userModel
            .findById({ _id: userId, isActive: true })
            .select('name totalPoints')
            .lean();

        if (!user) return next(createError.BadRequest('redeem.invalidQr'));

        let userSpecificP = await userPoint.findOne({
            user: userId,
            vendor: vendor,
        });

        user.totalPoints = userSpecificP ? userSpecificP.totalPoints : 0;

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
        const vendorId = req.body.vendor;

        if (vendorId !== req.staff.vendor.toString()) {
            return res.status(404).json({
                success: false,
                message: 'Menu item not found. Incorrect vendor details.',
            });
        }

        // Also get vendor, user, discount details if needed
        let categories = await categoryModel
            .find({ vendor: vendorId, isDelete: false })
            .select('name')
            .lean();

        let menuItems = await Promise.all(
            categories.map(async cat => {
                const items = await menuItemModel
                    .find({
                        vendor: vendorId,
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
        const { items } = req.body;

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

exports.addCart = async (req, res, next) => {
    try {
        const { userId, menuItemId, quantity } = req.body;
        console.log('quantity: ', quantity);

        const menuItem = await menuItemModel.findById(menuItemId);
        if (!menuItem)
            return res
                .status(404)
                .json({ success: false, message: 'Menu item not found' });

        let cart = await cartModel.findOne({ user: userId });

        if (!cart) {
            cart = new cartModel({
                user: userId,
                items: [{ menuItem: menuItemId, quantity: quantity }],
            });
        } else {
            const itemIndex = cart.items.findIndex(
                item => item.menuItem.toString() === menuItemId
            );

            if (itemIndex > -1) cart.items[itemIndex].quantity += 1;
            else cart.items.push({ menuItem: menuItemId, quantity: quantity });
        }

        await cart.save();
        console.log('cart: ', cart);

        res.status(200).json({
            success: true,
            message: 'Item added to cart',
            cart,
        });
    } catch (error) {
        next(error);
    }
};

// Decrease quantity or remove item
exports.decreaseCart = async (req, res, next) => {
    try {
        const { userId, menuItemId } = req.body;

        let cart = await cartModel.findOne({ user: userId });
        if (!cart)
            return res
                .status(404)
                .json({ success: false, message: 'Cart not found' });

        const itemIndex = cart.items.findIndex(
            item => item.menuItem.toString() === menuItemId
        );
        if (itemIndex > -1)
            if (cart.items[itemIndex].quantity > 1)
                cart.items[itemIndex].quantity -= 1;
            else cart.items.splice(itemIndex, 1);

        await cart.save();

        res.status(200).json({
            success: true,
            message: 'Item quantity updated',
            cart,
        });
    } catch (error) {
        next(error);
    }
};

exports.clearCart = async (req, res, next) => {
    try {
        const { userId } = req.body;

        const deletedCart = await cartModel.findOneAndDelete({ user: userId });

        if (!deletedCart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cart has been cleared',
        });
    } catch (error) {
        next(error);
    }
};

exports.getCart = async (req, res, next) => {
    try {
        const userId = req.params.userId;

        const cart = await cartModel
            .findOne({ user: userId })
            .populate('items.menuItem', 'name price image')
            .lean();

        if (!cart)
            return res
                .status(404)
                .json({ success: false, message: 'Cart is empty', data: [] });

        res.status(200).json({
            success: true,
            message: 'Cart details',
            data: cart,
        });
    } catch (error) {
        next(error);
    }
};

// exports.checkDiscount = async (req, res, next) => {
//     try {
//         const discount = await discountModel
//             .findById(req.params.discountId)
//             .select('-__v -updatedAt')
//             .lean();
//         if (!discount) return next(createError.BadRequest('discount.invalid'));

//         const [day, month, year] = discount.expiryDate.split('/'); // Split the string
//         const expiryDate = new Date(`${year}-${month}-${day}`); // Convert to Date object

//         // const [day, month, year] = discount.expiryDate.split('/').map(Number);
//         // const expiryDate = new Date(year, month - 1, day); // Month is 0-based

//         if (expiryDate < new Date())
//             return next(createError.BadRequest('discount.expired'));

//         // Check total max usage
//         if (
//             discount.totalUserCount &&
//             discount.redeemUserCount >= discount.totalUserCount
//         )
//             return next(createError.BadRequest('discount.expired'));

//         // !Need to increase totalUserCount or redeemUserCount and save in db
//         // !coupon usage pening (only once)
//         // ! Pending maxUsage implementation
//         // !Customer how much points earned from this discount or order need to send in response
//         // !user name total balance points as per figma
//         // Check maxUsage
//         // const usage = await UserPromoAssociation.countDocuments({
//         //     subscriber: req.subscriber.id,
//         //     promoCode: promoCode.id,
//         // });

//         // if (promoCode.maxUsage && usage >= promoCode.maxUsage)
//         //     return next(createError.BadRequest('promoCode.limit'));

//         // Check cart
//         const cart = await cartModel
//             .findOne({ user: req.params.userId })
//             .populate('items.menuItem', 'name price')
//             .select('-__v -updatedAt -user')
//             .lean();
//         if (!cart) return next(createError.BadRequest('cart.not_found'));

//         console.log(JSON.stringify(cart));

//         // Calculate the total amount in the cart
//         let totalCartAmount = 0;
//         cart.items.forEach(item => {
//             totalCartAmount += item.menuItem.price * item.quantity;
//         });

//         if (totalCartAmount < discount.minBillAmount)
//             return next(createError.BadRequest('discount.min_bill_not_met'));

//         // Apply discount based on type
//         let discountAmount = 0;
//         if (discount.discountType === 'Percentage') {
//             discountAmount = (totalCartAmount * discount.discountValue) / 100;
//         } else if (discount.discountType === 'Fixed') {
//             discountAmount = discount.discountValue;
//         }
//         const finalAmount = totalCartAmount - discountAmount;

//         // Prevent discount from exceeding the total cart amount
//         if (discountAmount > totalCartAmount) discountAmount = totalCartAmount;

//         // !Redemable poins pending

//         res.json({
//             success: true,
//             message: req.t('discount.applied'),
//             data: {
//                 ...cart,
//                 originalAmount: totalCartAmount,
//                 discountAmount: discountAmount,
//                 finalAmount: finalAmount,
//             },
//         });
//     } catch (error) {
//         next(error);
//     }
// };

exports.checkDiscount = async (req, res, next) => {
    try {
        const discount = await discountModel
            .findById(req.body.discountId)
            .select('-__v -updatedAt')
            .lean();

        if (!discount) {
            return next(createError.BadRequest('discount.invalid'));
        }

        // Parse expiry date
        const expiryStr = discount.expiryDate?.trim(); // e.g., "02/07/2025 10:44 AM"
        let expiryDate;

        if (!expiryStr) {
            return next(createError.BadRequest('discount.expiry_date_missing'));
        }

        if (/am|pm/i.test(expiryStr)) {
            // Format: dd/mm/yyyy hh:mm AM/PM
            const [datePart, timePart, meridian] = expiryStr.split(' ');
            const [day, month, year] = datePart.split('/').map(Number);
            const [hourStr, minuteStr] = timePart.split(':');
            let hour = parseInt(hourStr, 10);
            const minute = parseInt(minuteStr, 10);

            if (meridian.toUpperCase() === 'PM' && hour !== 12) hour += 12;
            if (meridian.toUpperCase() === 'AM' && hour === 12) hour = 0;

            expiryDate = new Date(year, month - 1, day, hour, minute);
        } else {
            // Format: dd/mm/yyyy
            const [day, month, year] = expiryStr.split('/').map(Number);
            expiryDate = new Date(year, month - 1, day, 23, 59, 59); // End of the day
        }

        const now = new Date(req.body.time);

        if (expiryDate < now) {
            return next(createError.BadRequest('discount.expired'));
        }

        // Check total max usage
        if (
            discount.totalUserCount &&
            discount.redeemUserCount >= discount.totalUserCount
        ) {
            return next(createError.BadRequest('discount.user_usage_limit'));
        }

        const userUsage = discount.userUsages?.find(
            u => u.user.toString() === req.body.userId
        );
        if (
            userUsage &&
            discount.couponUsage &&
            userUsage.count >= discount.couponUsage
        ) {
            return next(
                createError.BadRequest('auth.user_usage_limit_reached')
            );
        }

        // Get user's cart
        const cart = await cartModel
            .findOne({ user: req.body.userId })
            .populate('items.menuItem', 'name price')
            .select('-__v -updatedAt -user')
            .lean();

        if (!cart) {
            return next(createError.BadRequest('cart.not_found'));
        }

        // Calculate total cart amount
        let totalCartAmount = 0;
        cart.items.forEach(item => {
            totalCartAmount += item.menuItem.price * item.quantity;
        });

        if (totalCartAmount < discount.minBillAmount) {
            return next(createError.BadRequest('discount.min_bill_not_met'));
        }

        // Apply discount
        let discountAmount = 0;
        let finalAmount = totalCartAmount;
        let spentPoints = 0;
        if (discount.discountType === 'Percentage') {
            discountAmount = (totalCartAmount * discount.discountValue) / 100;
        } else if (discount.discountType === 'Fixed') {
            discountAmount = discount.discountValue;
        }
        finalAmount = totalCartAmount - discountAmount;

        // Ensure discount doesn't exceed total
        if (discountAmount > totalCartAmount) {
            discountAmount = totalCartAmount;
        }

        if (
            req.body.redeemBalancePoint === true ||
            req.body.redeemBalancePoint === 'true'
        ) {
            const redemptionResult = await handlePointsRedemption(
                req.body.userId,
                finalAmount,
                req.staff.vendor
            );

            if (redemptionResult) {
                finalAmount = redemptionResult.finalAmount;
                spentPoints = redemptionResult.spentPoints;
            }
        }
        // console.log('cart: check disc', cart);
        // console.log('totalCartAmount: ', totalCartAmount);
        // console.log('finalAmount: ', finalAmount);
        // console.log('spentPoints: ', spentPoints);

        res.json({
            success: true,
            message: req.t('discount.applied'),
            discountAmount,
            data: {
                ...cart,
                billAmount: totalCartAmount,
                discountAmount,
                finalAmount,
                spentPoints,
            },
        });
    } catch (error) {
        console.error(error);
        next(error);
    }
};

exports.checkDiscount2 = async (req, res, next) => {
    try {
        const discount = await discountModel
            .findById(req.body.discountId)
            .select('-__v -updatedAt')
            .lean();

        if (!discount) {
            return next(createError.BadRequest('discount.invalid'));
        }

        // // Parse expiry date
        // const expiryStr = discount.expiryDate?.trim(); // e.g., "02/07/2025 10:44 AM"
        // let expiryDate;

        // if (!expiryStr) {
        //     return next(createError.BadRequest('discount.expiry_date_missing'));
        // }

        // if (/am|pm/i.test(expiryStr)) {
        //     // Format: dd/mm/yyyy hh:mm AM/PM
        //     const [datePart, timePart, meridian] = expiryStr.split(' ');
        //     const [day, month, year] = datePart.split('/').map(Number);
        //     const [hourStr, minuteStr] = timePart.split(':');
        //     let hour = parseInt(hourStr, 10);
        //     const minute = parseInt(minuteStr, 10);

        //     if (meridian.toUpperCase() === 'PM' && hour !== 12) hour += 12;
        //     if (meridian.toUpperCase() === 'AM' && hour === 12) hour = 0;

        //     expiryDate = new Date(year, month - 1, day, hour, minute);
        // } else {
        //     // Format: dd/mm/yyyy
        //     const [day, month, year] = expiryStr.split('/').map(Number);
        //     expiryDate = new Date(year, month - 1, day, 23, 59, 59); // End of the day
        // }

        // const now = new Date(req.body.time);

        // if (expiryDate < now) {
        //     return next(createError.BadRequest('discount.expired'));
        // }

        // // Check total max usage
        // if (
        //     discount.totalUserCount &&
        //     discount.redeemUserCount >= discount.totalUserCount
        // ) {
        //     return next(createError.BadRequest('discount.expired'));
        // }

        // Get user's cart
        const cart = await cartModel
            .findOne({ user: req.body.userId })
            .populate('items.menuItem', 'name price')
            .select('-__v -updatedAt -user')
            .lean();

        if (!cart) {
            return next(createError.BadRequest('cart.not_found'));
        }

        // Calculate total cart amount
        let totalCartAmount = 0;
        cart.items.forEach(item => {
            totalCartAmount += item.menuItem.price * item.quantity;
        });

        if (totalCartAmount < discount.minBillAmount) {
            return next(createError.BadRequest('discount.min_bill_not_met'));
        }

        // Apply discount
        let discountAmount = 0;
        let finalAmount = totalCartAmount;
        let spentPoints = 0;
        if (discount.discountType === 'Percentage') {
            discountAmount = (totalCartAmount * discount.discountValue) / 100;
        } else if (discount.discountType === 'Fixed') {
            discountAmount = discount.discountValue;
        }
        finalAmount = totalCartAmount - discountAmount;

        // Ensure discount doesn't exceed total
        if (discountAmount > totalCartAmount) {
            discountAmount = totalCartAmount;
        }

        if (
            req.body.redeemBalancePoint === true ||
            req.body.redeemBalancePoint === 'true'
        ) {
            const redemptionResult = await handlePointsRedemption(
                req.body.userId,
                finalAmount,
                req.staff.vendor
            );

            if (redemptionResult) {
                finalAmount = redemptionResult.finalAmount;
                spentPoints = redemptionResult.spentPoints;
            }
        }

        res.json({
            success: true,
            message: req.t('discount.applied'),
            discountAmount,
            data: {
                ...cart,
                billAmount: totalCartAmount,
                discountAmount,
                finalAmount,
                spentPoints,
            },
        });
    } catch (error) {
        console.error(error);
        next(error);
    }
};

// checkout staff
exports.checkout = async (req, res, next) => {
    try {
        const cart = await cartModel
            .findOne({ user: req.body.userId })
            .populate('items.menuItem', 'name price')
            .populate('user', 'name');
        if (!cart || !cart.items.length)
            return next(
                createError.BadRequest('Cart is empty, can not checkout.')
            );
        console.log('cart: ', cart);

        const subtotal = cart.items.reduce((total, item) => {
            return total + item.menuItem.price * item.quantity;
        }, 0);

        const orderItems = cart.items.map(item => ({
            menuItem: item.menuItem,
            quantity: item.quantity,
        }));

        let finalAmount = subtotal;
        let spentPoints = 0;
        let discountAmount = 0;

        if (req.body.discountId) {
            const discount = await discountModel
                .findById(req.body.discountId)
                .select('-__v -updatedAt')
                .lean();
            if (!discount)
                return next(createError.BadRequest('discount.invalid'));

            const [day, month, year] = discount.expiryDate.split('/'); // Split the string
            const expiryDate = new Date(`${year}-${month}-${day}`); // Convert to Date object

            // if (expiryDate < new Date())
            //     return next(createError.BadRequest('discount.expired'));

            // Check total max usage
            if (
                discount.totalUserCount &&
                discount.redeemUserCount >= discount.totalUserCount
            )
                return next(createError.BadRequest('discount.expired'));

            if (subtotal < discount.minBillAmount)
                return next(
                    createError.BadRequest('discount.min_bill_not_met')
                );

            let discountValue = discount.discountValue;
            if (typeof discountValue === 'string') {
                discountValue = discountValue.replace('%', '');
            }
            discountValue = Number(discountValue);

            if (isNaN(discountValue)) {
                return next(createError.BadRequest('discount.value_invalid'));
            }

            if (discount.discountType === 'Percentage') {
                discountAmount = (subtotal * discountValue) / 100;
            } else if (discount.discountType === 'Fixed') {
                discountAmount = discountValue;
            }

            if (discountAmount > subtotal) {
                discountAmount = subtotal;
            }

            // Deduct discount from the subtotal first
            finalAmount = subtotal - discountAmount;
        }

        if (
            req.body.redeemBalancePoint === true ||
            req.body.redeemBalancePoint === 'true'
        ) {
            const redemptionResult = await handlePointsRedemption(
                req.body.userId,
                finalAmount,
                req.staff.vendor
            );

            if (redemptionResult) {
                finalAmount = redemptionResult.finalAmount;
                spentPoints = redemptionResult.spentPoints;
            }
        }

        const expiredOrders = await transactionModel.updateMany(
            { status: 'pending', user: req.body.userId },
            { status: 'expired' }
        );

        const tID = generateCode(8);

        const order = await transactionModel.create({
            user: req.body.userId,
            staff: req.staff.id,
            items: orderItems,
            billAmount: subtotal,
            discountAmount,
            status: 'pending',
            spentPoints,
            tID,
            finalAmount, // The final amount after discount and points redemption need to pay by the user
            redeemBalancePoint: req.body.redeemBalancePoint,
            ...(req.body.discountId && { discount: req.body.discountId }),
        });

        await cartModel.findOneAndUpdate(
            { user: req.body.userId },
            { items: [] }
        );

        let fcmTokens = await userModel
            .findById(req.body.userId)
            .select('fcmToken');
        let title = 'Transaction Details';
        // const body = 'Your order is being processed.';
        const userName = cart.user?.name || 'Customer';
        const bill = order.finalAmount?.toFixed(2) || '0.00';

        const body = `Hello ${userName}, your order is being processed. Total bill: ${bill}.`;
        const data = {
            order_id: order.id.toString(),
            type: 'checkout',
        };
        if (fcmTokens?.fcmToken) {
            await sendNotificationsToTokenscheckout(
                title,
                body,
                [fcmTokens.fcmToken],
                data
            );
            await userNotificationModel.create({
                sentTo: [fcmTokens?._id],
                title,
                body,
            });
        }
        // await staffNotificationModel.create({
        //     sentTo: [req.staff.id],
        //     title,
        //     body,
        // });
        // console.log('----------------------------------');
        // console.log('order: ', order);
        // console.log('----------------------------------');

        res.status(201).json({
            success: true,
            message: req.t('order'),
            order,
        });
    } catch (error) {
        next(error);
    }
};

//? For USER call this every 10 sec to show the user then user can accept or reject the order
exports.getCurrentTransaction = async (req, res, next) => {
    try {
        let transactions = await transactionModel
            .findOne({ user: req.user.id, status: 'pending' })
            .populate('items.menuItem', 'name price')
            .populate(
                'discount',
                'discountType discountValue title description'
            )
            .populate({
                path: 'staff',
                select: 'branch vendor',
                populate: [
                    {
                        path: 'branch',
                        select: 'city state name country buildingName buildingNo roadName',
                    },
                    {
                        path: 'vendor',
                        select: 'businessName businessLogo',
                    },
                ],
            })
            .sort({
                createdAt: -1,
            })
            .select('-__v')
            .lean();
        if (!transactions)
            return next(
                createError.BadRequest(
                    'transactions is empty, can not checkout.'
                )
            );

        const amount = transactions.billAmount - transactions.discountAmount;

        const points = transactions?.discount?.discountValue;

        let userSpecificP = await userPoint.findOne({
            user: transactions.user,
            vendor: transactions.staff.vendor,
        });

        if (transactions) {
            transactions.totalPoints = userSpecificP
                ? userSpecificP.totalPoints
                : 0;
        }

        res.status(200).json({
            success: true,
            // message: `You can receive ${points} points on this purchase.`,
            transactions,
        });
    } catch (error) {
        console.log('error: ', error);
        next(error);
    }
};

//? Accept or Reject an order by USER
exports.updateOrderStatus = async (req, res, next) => {
    try {
        const { status, transactionTime } = req.body;
        const user = req.user;

        if (!status || !['accepted', 'rejected'].includes(status))
            return next(
                createError.BadRequest(
                    'Invalid status. Must be "accepted" or "rejected"'
                )
            );
        // if (!transactionTime)
        //     return next(createError.BadRequest('transactionTime is required'));

        let order = await transactionModel
            .findOne({
                _id: req.body.orderId,
                user: req.user.id,
                status: 'pending',
            })
            .populate(
                'discount',
                'discountType discountValue title description'
            )
            .populate({
                path: 'staff',
                select: 'branch vendor fcmToken',
                populate: [
                    {
                        path: 'branch',
                        select: 'city state name country buildingName buildingNo roadName',
                    },
                    {
                        path: 'vendor',
                        select: 'businessName businessLogo adminCommission',
                    },
                ],
            })
            .select('-__v -updatedAt');
        if (!order) return next(createError.NotFound('Order not found'));

        // Calculate final amount the user has to pay (bill - redeemed points)
        // let finalAmount = order.billAmount - order.spentPoints;

        let finalAmount =
            order.billAmount - order.discountAmount - order.spentPoints;

        // Calculate earned points based on billAmount (discount doesn't apply now)
        let points = 0;

        // if (order.discount) {
        //     const { discountType, discountValue } = order.discount;

        //     if (discountType === 'Percentage') {
        //         points = (order.billAmount * discountValue) / 100;
        //     } else if (discountType === 'Fixed') {
        //         points = discountValue;
        //     }
        // }

        // points = Math.floor(points);

        points = Math.floor(finalAmount);
        // console.log('finalAmount: us', finalAmount);
        // console.log('points: us', points);

        let userSpecificP = null;
        if (status === 'accepted') {
            order.status = 'accepted';
            // order.earnedPoints = (order.earnedPoints || 0) + points;
            order.earnedPoints = points;
            order.finalAmount = finalAmount; // Save actual final amount user paid

            const adminCommissionPercent =
                order.staff?.vendor?.adminCommission || 0;
            const adminCommissionAmount =
                (order.billAmount * adminCommissionPercent) / 100;
            order.adminCommission = adminCommissionAmount;

            user.totalPoints =
                (user.totalPoints || 0) - order.spentPoints + points;
            // user.totalPoints -= order.spentPoints; // Deduct the spent points from the user's account
            // user.totalPoints += points; // earned points from the current order

            userSpecificP = await userPoint.findOne({
                user: user._id,
                vendor: order.staff.vendor,
            });

            const discount = await discountModel.findById(order.discount.id);

            const usageIndex = discount.userUsages.findIndex(
                u => u.user.toString() === user._id.toString()
            );

            if (usageIndex > -1) {
                discount.userUsages[usageIndex].count += 1;
            } else {
                discount.userUsages.push({
                    user: user._id.toString(),
                    count: 1,
                });
            }

            discount.redeemUserCount += 1;

            await discount.save();

            if (!userSpecificP) {
                // Create a new userPoint record if it doesn't exist
                userSpecificP = new userPoint({
                    user: user._id,
                    vendor: order.staff.vendor,
                    totalPoints: 0,
                });
            }

            // Update the totalPoints
            userSpecificP.totalPoints =
                (userSpecificP.totalPoints || 0) - order.spentPoints + points;

            await userSpecificP.save();

            let dataa;
            // 1. Record spent points (if any)
            if (order.spentPoints > 0) {
                dataa = await PointsHistory.create({
                    user: user._id,
                    staff: order.staff.id,
                    transaction: order._id,
                    type: 'spend',
                    points: order.spentPoints,
                    transactionTime,
                });
            }

            // 2. Record earned points
            if (points > 0) {
                dataa = await PointsHistory.create({
                    staff: order.staff.id,
                    user: user._id,
                    transaction: order._id,
                    type: 'earn',
                    points: points,
                    transactionTime,
                });
            }
        } else {
            order.status = 'rejected';
            // user.totalPoints += order.spentPoints; // Restore the spent points back to the user
            // now we are not deducting points in checkout API
        }

        await order.save();
        await user.save();

        let title = 'Order Status Update';
        const userName = order.user?.name || 'User';
        const bill = order.finalAmount?.toFixed(2) || '0.00';

        const body = `Order status for ${userName} is ${status}. Bill amount: ${bill}.`;
        const data = {
            order_id: order.id.toString(),
            type: 'order',
            body,
        };
        if (order.staff?.fcmToken) {
            await sendNotificationsToTokenscheckout(
                title,
                body,
                [order.staff?.fcmToken],
                data
            );
            await staffNotificationModel.create({
                sentTo: [order?.staff],
                title,
                body,
            });
        }

        order = order.toObject();
        order.totalPoints = userSpecificP?.totalPoints || 0;
        // console.log('----------------------------------');
        // console.log('order: us', order);
        // console.log('----------------------------------');

        res.status(200).json({
            success: true,
            message: `Order has been ${status}`,
            order,
        });
    } catch (error) {
        next(error);
    }
};

//? For Staff call this every 10 sec to show the user action
exports.getCurrentTransactionStaff = async (req, res, next) => {
    try {
        let transactions = await transactionModel
            .findOne({
                staff: req.staff.id,
                _id: req.body.transactionsid,
                // status: { $in: ['accepted', 'rejected'] },
            })
            .populate('user', 'name')
            .populate('items.menuItem', 'name price')
            .populate({
                path: 'discount',
                select: 'title minBillAmount discountType discountValue', // Add more fields if needed
            })
            .populate({
                path: 'staff',
                select: 'branch vendor',
                populate: [
                    {
                        path: 'branch',
                        select: 'city state name country buildingName buildingNo roadName',
                    },
                    {
                        path: 'vendor',
                        select: 'businessName',
                    },
                ],
            })
            .sort({
                createdAt: -1,
            })
            .select('-__v')
            .lean();
        if (!transactions)
            return next(
                createError.BadRequest(
                    'transactions is empty, can not checkout.'
                )
            );
        let discountAmount = 0;
        if (transactions?.earnedPoints) {
            discountAmount = transactions?.earnedPoints;
        }

        let userSpecificP = await userPoint.findOne({
            user: transactions.user._id,
            vendor: transactions.staff.vendor,
        });
        // console.log('userSpecificP: ', userSpecificP);

        if (transactions) {
            transactions.totalPoints = userSpecificP
                ? userSpecificP.totalPoints
                : 0;
        }

        // console.log('transactions: ', transactions);

        res.status(200).json({
            success: true,
            transactions,
            msg: `Customer can receive ${discountAmount} points on this purchase.`,
        });
    } catch (error) {
        next(error);
    }
};

const handlePointsRedemption = async (userId, subtotal, vendor) => {
    const user = await userPoint
        .findOne({
            user: userId,
            vendor: vendor.toString(),
        })
        .select('totalPoints');
    console.log('useruserPoint: ', user);

    let finalAmount = subtotal;
    let spentPoints = 0; // to track how many points are used by the user to pay bill amount

    if (!user) return null;
    if (user.totalPoints >= subtotal) {
        // User has enough points to cover the entire subtotal
        finalAmount = 0; // The final amount becomes 0 because points cover the entire subtotal
        spentPoints = subtotal;
        user.totalPoints -= subtotal;
    } else {
        // User has fewer points than the subtotal
        finalAmount = subtotal - user.totalPoints; // Deduct all points and leave the remaining balance
        spentPoints = user.totalPoints;
        user.totalPoints = 0;
    }

    // await user.save();
    console.log('finalAmount, spentPoints: ', finalAmount, spentPoints);

    return { finalAmount, spentPoints };
};

exports.getReports = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const user = req.user;

        const start = startDate
            ? new Date(startDate)
            : moment().startOf('month').toDate();
        const end = endDate
            ? new Date(endDate)
            : moment().endOf('month').toDate();

        // Filter transactions within date range for the user
        const transactions = await transactionModel.find({
            user: user._id,
            status: 'accepted',
            createdAt: { $gte: start, $lte: end },
        });

        const totalPointsRedeemed = transactions.reduce(
            (sum, tx) => sum + (tx.spentPoints || 0),
            0
        );
        const totalDiscount = transactions.reduce(
            (sum, tx) => sum + (tx.discountAmount || 0),
            0
        );
        const totalTransactions = transactions.length;
        const adminCommission = transactions.reduce(
            (sum, tx) => sum + (tx.adminCommission || 0),
            0
        );

        // Points redemption history (latest 10)
        const redemptionHistory = await PointsHistory.find({
            user: user._id,
            type: 'spend',
            createdAt: { $gte: start, $lte: end },
        })
            .sort({ createdAt: -1 })
            .limit(100)
            .select('points transaction createdAt')
            .populate({
                path: 'transaction',
                select: 'discountAmount',
            });

        // Points summary (total, earned, spent)
        const [earnedTotal, spentTotal] = await Promise.all([
            PointsHistory.aggregate([
                {
                    $match: {
                        user: user._id,
                        type: 'earn',
                        createdAt: { $gte: start, $lte: end },
                    },
                },
                { $group: { _id: null, total: { $sum: '$points' } } },
            ]),
            PointsHistory.aggregate([
                {
                    $match: {
                        user: user._id,
                        type: 'spend',
                        createdAt: { $gte: start, $lte: end },
                    },
                },
                { $group: { _id: null, total: { $sum: '$points' } } },
            ]),
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalPointsRedeemed,
                totalDiscount,
                totalTransactions,
                adminCommission,
                pointsRedemption: redemptionHistory.map(item => ({
                    date: item.createdAt,
                    points: item.points,
                    discount: item.transaction?.discountAmount || 0,
                })),
                customerActivity: {
                    totalPoints: user.totalPoints || 0,
                    pointsGiven: earnedTotal[0]?.total || 0,
                    pointsRedeemed: spentTotal[0]?.total || 0,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/reports?startDate=2024-11-01&endDate=2024-11-30

/* If user can not do accept/reject he lost his points
   to solve this updateOrderStatus API in this deduct user.totalPoints
   insted of checkout API whihc is use by staff
        if (status === 'accepted') {
            order.status = 'accepted';
            order.earnedPoints = points;

            // Deduct points from the user's total if the order is accepted
            user.totalPoints -= order.spentPoints;  // Deduct the spent points from the user's account
            user.totalPoints += points;  // Add the earned points to the user's account
        } */
