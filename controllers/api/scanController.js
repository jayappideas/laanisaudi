const createError = require('http-errors');
const userModel = require('../../models/userModel');
const categoryModel = require('../../models/categoryModel');
const menuItemModel = require('../../models/menuItemModel');
const cartModel = require('../../models/cartModel');
const discountModel = require('../../models/discountModel');
const transactionModel = require('../../models/transactionModel');

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

        const [day, month, year] = discount.expiryDate.split('/'); // Split the string
        const expiryDate = new Date(`${year}-${month}-${day}`); // Convert to Date object

        // const [day, month, year] = discount.expiryDate.split('/').map(Number);
        // const expiryDate = new Date(year, month - 1, day); // Month is 0-based

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

exports.checkout = async (req, res, next) => {
    try {
        let user = await userModel
            .findOne({ _id: req.params.userId, isActive: true })
            .select('name totalPoints');

        const cart = await cartModel
            .findOne({ user: req.params.userId })
            .populate('items.menuItem', 'name price');
        if (!cart || !cart.items.length)
            return next(
                createError.BadRequest('Cart is empty, can not checkout.')
            );

        if (req.body.discountId) {
            const discount = await discountModel
                .findById(req.params.discountId)
                .select('-__v -updatedAt')
                .lean();
            if (!discount)
                return next(createError.BadRequest('discount.invalid'));

            const [day, month, year] = discount.expiryDate.split('/'); // Split the string
            const expiryDate = new Date(`${year}-${month}-${day}`); // Convert to Date object

            // const [day, month, year] = discount.expiryDate.split('/').map(Number);
            // const expiryDate = new Date(year, month - 1, day); // Month is 0-based

            if (expiryDate < new Date())
                return next(createError.BadRequest('discount.expired'));

            // Check total max usage
            if (
                discount.totalUserCount &&
                discount.redeemUserCount >= discount.totalUserCount
            )
                return next(createError.BadRequest('discount.expired'));

            // Calculate the total amount in the cart
            let totalCartAmount = cart.items.reduce((total, item) => {
                return total + item.menuItem.price * item.quantity;
            }, 0);

            if (totalCartAmount < discount.minBillAmount)
                return next(
                    createError.BadRequest('discount.min_bill_not_met')
                );

            // Apply discount based on type
            let discountAmount = 0;
            if (discount.discountType === 'Percentage') {
                discountAmount =
                    (totalCartAmount * discount.discountValue) / 100;
            } else if (discount.discountType === 'Fixed') {
                discountAmount = discount.discountValue;
            }
            const amount = totalCartAmount - discountAmount;

            if (req.body.redeemBalancePoint) {
                if (user.totalPoints >= amount) {
                    user.totalPoints -= amount;
                    await user.save();
                } else {
                    return next(createError.BadRequest('Insufficient points'));
                }
            }

            if (discountAmount > totalCartAmount)
                // Prevent discount from exceeding the total cart amount
                discountAmount = totalCartAmount;
        }

        // Check promo code

        // Create transaction
        // const orderItems = cart.items.map(item => ({
        //     menuItem: item.menuItem,
        //     quantity: item.quantity,
        //     price: item.price,
        // }));

        // const data = await transactionModel.create({
        //     user: req.params.userId,
        //     staff: req.staff.id,
        //     items: orderItems,
        //     type: 'spent',
        //     billAmount: subtotal,
        //     discountAmount: discount,
        //     status: 'pending',
        //     redeemPoint,
        // });

        // Create invoice
        // await Invoice.create({ ...order._doc, order: order.id });

        // Create UserPromoAssociation
        // if (order.promoCode) {
        //     const promoCode = await PromoCode.findOne({
        //         code: order.promoCode,
        //     });

        //     // Increment usage count & Create Association
        //     if (promoCode) {
        //         promoCode.usageCount++;
        //         await Promise.all([
        //             promoCode.save(),
        //             UserPromoAssociation.create({
        //                 subscriber: subscriber,
        //                 promoCode: promoCode.id,
        //             }),
        //         ]);
        //     }
        // }

        // Add magazines

        // Empty cart
        // await cartModel.findOneAndUpdate({ subscriber }, { items: [] });

        res.status(201).json({
            success: true,
            message: req.t('order'),
            // data,
        });
    } catch (error) {
        next(error);
    }
};
