const createError = require('http-errors');
const transactionModel = require('../../models/transactionModel');
const discountModel = require('../../models/discountModel');
const cartModel = require('../../models/cartModel');
const userModel = require('../../models/userModel');

exports.scanQr = async (req, res, next) => {
    try {
        const userId = req.body.qrId;

        let user = await userModel
            .findById({ _id: userId, isActive: true })
            .select('name totalPoints');

        if (!user) return next(createError.BadRequest('redeem.invalidQr'));

        res.status(200).json({
            success: true,
            message: req.t('success'),
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

const getTransactionHistory = async (req, res, next) => {
    try {
        const transactions = await transactionModel
            .find({ user: req.user.id })
            .sort({
                createdAt: -1,
            });

        res.status(200).json({ success: true, transactions });
    } catch (error) {
        next(error);
    }
};
exports.getMenuList = async (req, res, next) => {
    try {
        const vendorId = req.staff.vendor;

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

exports.checkDiscount = async (req, res, next) => {
    try {
        const discount = await discountModel
            .findById(req.params.discountId)
            .select('-__v -updatedAt')
            .lean();
        if (!discount) return next(createError.BadRequest('discount.invalid'));
        // if (discount.status !== 'Active')
        //     return next(createError.BadRequest('discount.invalid'));
        // if (discount.adminApprovedStatus !== 'Approved')
        //     return next(createError.BadRequest('discount.invalid'));

        const [day, month, year] = discount.expiryDate.split('/'); // Split the string
        const expiryDate = new Date(`${year}-${month}-${day}`); // Convert to Date object
        if (expiryDate < new Date())
            return next(createError.BadRequest('discount.expired'));

        // Check total max usage
        if (
            discount.totalUserCount &&
            discount.redeemUserCount >= discount.totalUserCount
        )
            return next(createError.BadRequest('discount.expired'));

        // !coupon usage pening (only once)
        // ! Pending maxUsage implementation
        // Check maxUsage
        // const usage = await UserPromoAssociation.countDocuments({
        //     subscriber: req.subscriber.id,
        //     promoCode: promoCode.id,
        // });

        // if (promoCode.maxUsage && usage >= promoCode.maxUsage)
        //     return next(createError.BadRequest('promoCode.limit'));

        // Check cart
        const cart = await cartModel
            .findOne({ user: req.params.userId })
            .populate('items.menuItem', 'name price')
            .select('-__v -updatedAt -user')
            .lean();
        if (!cart) return next(createError.BadRequest('cart.not_found'));

        // Calculate the total amount in the cart
        let totalCartAmount = 0;
        cart.items.forEach(item => {
            totalCartAmount += item.menuItem.price * item.quantity;
        });

        if (totalCartAmount < discount.minBillAmount)
            return next(createError.BadRequest('discount.min_bill_not_met'));

        // Apply discount based on type
        let discountAmount = 0;
        if (discount.discountType === 'Percentage') {
            discountAmount = (totalCartAmount * discount.discountValue) / 100;
        } else if (discount.discountType === 'Fixed') {
            discountAmount = discount.discountValue;
        }
        const finalAmount = totalCartAmount - discountAmount;

        // Prevent discount from exceeding the total cart amount
        if (discountAmount > totalCartAmount) discountAmount = totalCartAmount;

        // !Redemable poins pending

        res.json({
            success: true,
            message: req.t('discount.applied'),
            data: {
                ...cart,
                originalAmount: totalCartAmount,
                discountAmount: discountAmount,
                finalAmount: finalAmount,
            },
        });
    } catch (error) {
        next(error);
    }
};

// checkout staff
exports.checkout = async (req, res, next) => {
    try {
        const cart = await cartModel
            .findOne({ user: req.params.userId })
            .populate('items.menuItem', 'name price');
        if (!cart || !cart.items.length)
            return next(
                createError.BadRequest('Cart is empty, can not checkout.')
            );

        const subtotal = cart.items.reduce((total, item) => {
            return total + item.price * item.quantity;
        }, 0);

        const orderItems = cart.items.map(item => ({
            menuItem: item.menuItem,
            quantity: item.quantity,
            price: item.price,
        }));

        let finalAmount = subtotal;
        let spentPoints = 0;

        if (req.body.redeemBalancePoint) {
            const redemptionResult = await handlePointsRedemption(
                req.params.userId,
                subtotal
            );
            finalAmount = redemptionResult.finalAmount;
            spentPoints = redemptionResult.spentPoints;
        }

        const order = await transactionModel.create({
            user: req.params.userId,
            staff: req.staff.id,
            items: orderItems,
            type: 'spent',
            billAmount: subtotal,
            // discountAmount: subtotal - finalAmount, //! calculate discount
            status: 'pending',
            spentPoints,
            finalAmount,
        });

        await cartModel.findOneAndUpdate(
            { user: req.params.userId },
            { items: [] }
        );

        res.status(201).json({
            success: true,
            message: req.t('order'),
            order: removeFields(order),
        });
    } catch (error) {
        next(error);
    }
};

const handlePointsRedemption = async (userId, subtotal) => {
    const user = await userModel.findById(userId).select('totalPoints');

    let finalAmount = subtotal;
    let spentPoints = 0; // to track how many points are used

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

    await user.save();

    return { finalAmount, spentPoints };
};
