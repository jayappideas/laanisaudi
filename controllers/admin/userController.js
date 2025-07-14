const User = require('../../models/userModel');
const userNotificationModel = require('../../models/userNotificationModel');
const {
    sendNotificationsToTokens,
} = require('../../utils/sendNotificationStaff');

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ isDelete: false })
            .select(
                'qrCode name mobileNumber birthDate gender createdAt isActive'
            )
            .sort('-_id');

        res.render('user', { users });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin');
    }
};

exports.viewUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            req.flash('red', 'User not found!');
            return res.redirect('/admin/user');
        }

        res.render('user_view', { user });
    } catch (error) {
        if (error.name === 'CastError') req.flash('red', 'User not found!');
        else req.flash('red', error.message);
        res.redirect('/admin/user');
    }
};

exports.changeUserStatus = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            req.flash('red', 'User not found.');
            return res.redirect('/admin/user');
        }

        user.isActive = req.params.status;

        await user.save();

        req.flash('green', 'Status changed successfully.');
        res.redirect('/admin/user');
    } catch (error) {
        if (error.name === 'CastError' || error.name === 'TypeError')
            req.flash('red', 'User not found!');
        else req.flash('red', error.message);
        res.redirect('/admin/user');
    }
};

exports.getDeleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);

        req.flash('green', 'User deleted successfully.');
        res.redirect('/admin/user');
    } catch (error) {
        if (error.name === 'CastError' || error.name === 'TypeError')
            req.flash('red', 'User not found!');
        else req.flash('red', error.message);
        res.redirect('/admin/user');
    }
};

exports.sendNotification = async (req, res) => {
    try {
        const { title, body, selectedUserIds } = req.body;

        const userIds = selectedUserIds.split(',');

        const users = await User.find({
            _id: { $in: userIds },
            isNotification: 1,
        })
            .select('fcmToken')
            .lean();

        const fcmTokens = users.map(user => user.fcmToken);
        const usersWithNotification = users.map(user => user._id);
        const data = {
            type: 'admin_notification'
        };
        await sendNotificationsToTokens(title, body, fcmTokens, data);

        await userNotificationModel.create({
            sentTo: usersWithNotification,
            title,
            body,
        });

        req.flash('green', 'Notification sent successfully.');
        res.redirect('/admin/user');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/user');
    }
};

exports.deleteAccountUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        // const modifiedEmail = `${user.email}_deleted_${Date.now()}`;
        const modifiedMobileNumber = `${user.mobileNumber
            }_deleted_${Date.now()}`;

        user.isDelete = true;
        user.token = '';
        user.fcmToken = '';
        // user.email = modifiedEmail;
        user.mobileNumber = modifiedMobileNumber;

        //Points Removed

        await user.save();

        req.flash('green', 'User deleted successfully.');
        res.redirect('/admin/user');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/user');
    }
};