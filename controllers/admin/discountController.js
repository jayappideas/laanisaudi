const discountModel = require("../../models/discountModel");
const {
    sendNotificationsToTokens,
    sendNotificationsToTokenscheckout,
} = require('../../utils/sendNotificationStaff');
const vendorNotificationModel = require('../../models/vendorNotificationModel');

exports.getAllDiscount = async (req, res) => {

    try {
        const discounts = await discountModel.find({ isDelete: false }).select('-updatedAt -createdAt -__v')
            .populate({
                path: 'vendor',
                select: 'businessName'
            }).populate({
                path: 'customerType',
            }).sort('-_id');

        // Remove deleted vendor
        res.render('discount', { discounts });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin');
    }
};

exports.approvedDiscount = async (req, res) => {
    try {
        const user = await discountModel.findById(req.params.id);

        user.adminApprovedStatus = req.params.status

        await user.save();

        req.flash('green', 'Discount code approved successfully.');
        res.redirect('/admin/discount');
    } catch (error) {
        if (error.name === 'CastError' || error.name === 'TypeError')
            req.flash('red', 'discount not found!');
        else req.flash('red', error.message);
        res.redirect('/admin/discount');
    }
};

exports.approvedVendor = async (req, res) => {
    try {
        const user = await discountModel.findById(req.params.id).populate('vendor');

        user.adminApprovedStatus = 'Approved';

        await user.save();

        let title = 'Your Discount is Now Approved';
        const body = 'Your created discount has been successfully approved.';
        const data = {
            type: 'discount_approved'
        };

        if (user?.vendor?.fcmToken) {
            await sendNotificationsToTokenscheckout(
                title,
                body,
                [user?.vendor?.fcmToken],
                data,
            );
            await vendorNotificationModel.create({
                sentTo: [user?.vendor?._id],
                title,
                body,
            });
        }
        req.flash('green', 'Discount approved successfully.');
        res.redirect('/admin/discount');
    } catch (error) {
        console.log(error);

        if (error.name === 'CastError' || error.name === 'TypeError')
            req.flash('red', 'discount not found!');
        else req.flash('red', error.message);
        res.redirect('/admin/discount');
    }
};

exports.disapprovedVendor = async (req, res) => {
    try {
        const user = await discountModel.findById(req.params.id).populate('vendor');
        user.adminApprovedStatus = 'Rejected';

        await user.save();

        let title = 'Your Discount is Rejected';
        const body = 'We regret to inform you that your created discount has been rejected. Please contact admin for further assistance.';
        const data = {
            type: 'discount_rejected'
        };
        if (user?.vendor?.fcmToken) {
            await sendNotificationsToTokenscheckout(
                title,
                body,
                [user?.vendor?.fcmToken],
                data,
            );
            await vendorNotificationModel.create({
                sentTo: [user?.vendor?._id],
                title,
                body,
            });
        }

        // const branch = await branchModel.find({ vendor: req.params.id });
        // branch.forEach(async (branch) => {
        //     branch.isDelete = true;
        //     await branch.save();
        // });

        req.flash('green', 'Discount rejected successfully.');
        res.redirect('/admin/discount');
    } catch (error) {
        console.log(error);

        if (error.name === 'CastError' || error.name === 'TypeError')
            req.flash('red', 'discount not found!');
        else req.flash('red', error.message);
        res.redirect('/admin/discount');
    }
};