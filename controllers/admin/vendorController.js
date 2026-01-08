const staffModel = require('../../models/staffModel');
const branchModel = require('../../models/branchModel');
const vendorModel = require('../../models/vendorModel');
const vendorActivityLog = require('../../models/vendorActivityLog');
const path = require('path');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const businessTypeModel = require('../../models/businessTypeModel');
const countryCodes = require('../../countryCodes.json');
const vendorNotificationModel = require('../../models/vendorNotificationModel');
const {
    sendNotificationsToTokens,
    sendNotificationsToTokenscheckout,
} = require('../../utils/sendNotificationStaff');
const discountModel = require('../../models/discountModel');
const { sendEmail } = require('../../utils/sendMail');
const vendor = require('../../models/vendorModel');

exports.getAllVendors = async (req, res) => {
    try {
        const vendors = await vendorModel
            .find({ isDelete: false })
            .select(
                'qrCode email adminApproved createdAt isActive businessName'
            )
            .populate({
                path: 'businessType',
                select: 'en ar',
            })
            .sort('-_id');

        res.render('vendor', { vendors });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin');
    }
};

exports.viewVendor = async (req, res) => {
    try {
        const vendor = await vendorModel.findById(req.params.id).populate({
            path: 'businessType',
            select: 'en ar',
        });
        if (!vendor) {
            req.flash('red', 'vendor not found!');
            return res.redirect('/admin/vendor');
        }

        const branch = await branchModel
            .find({ vendor: req.params.id, isDelete: false })
            .select('-createdAt -updatedAt -__v')
            .sort('-_id');

        const staff = await staffModel
            .find({ vendor: req.params.id, isDelete: false })
            .select('qrCode name email mobileNumber occupation photo')
            .populate({
                path: 'branch',
                select: 'buildingName name',
            })
            .sort('-_id');

        // Fetch users who have points with this vendor
        const userPointModel = require('../../models/userPoint');
        const userModel = require('../../models/userModel');

        const userPoints = await userPointModel
            .find({ vendor: req.params.id })
            .populate({
                path: 'user',
                select: 'qrCode name mobileNumber language gender birthDate totalPoints isActive createdAt',
                match: { isDelete: false },
            })
            .sort('-totalPoints');

        // Filter out null users (deleted users)
        const users = userPoints
            .filter(up => up.user != null)
            .map(up => ({
                ...up.user.toObject(),
                vendorPoints: up.totalPoints,
            }));

        // ADD THIS: Fetch transactions with items for this vendor
        const transactionModel = require('../../models/transactionModel');
        const menuItemModel = require('../../models/menuItemModel');

        // Find menu items belonging to this vendor (fallback for older transactions that may not have vendor set)
        const menuItems = await menuItemModel
            .find({ vendor: req.params.id, isDelete: false })
            .select('_id')
            .lean();
        const menuItemIds = menuItems.map(mi => mi._id);

        const transactions = await transactionModel
            .find({
                status: 'accepted', // Only show completed transactions
                $or: [
                    { vendor: req.params.id },
                    { 'items.menuItem': { $in: menuItemIds } },
                ],
            })
            .populate({
                path: 'user',
                select: 'name mobileNumber qrCode',
                match: { isDelete: false },
            })
            .populate({
                path: 'staff',
                select: 'name email',
            })
            .populate({
                path: 'items.menuItem',
                select: 'name price image',
            })
            .populate({
                path: 'discount',
                select: 'title discountType discountValue',
            })
            .sort('-createdAt')
            .limit(100); // Limit to last 100 transactions for performance

        // Filter out transactions with deleted users
        const validTransactions = transactions.filter(t => t.user != null);

        // Aggregate unique buyers (customers) from these transactions
        const buyersMap = new Map();
        for (const t of validTransactions) {
            const u = t.user;
            const uid = u._id.toString();
            if (!buyersMap.has(uid)) {
                buyersMap.set(uid, {
                    ...u.toObject(),
                    totalSpent: 0,
                    txCount: 0,
                    lastPurchasedAt: t.createdAt,
                });
            }
            const b = buyersMap.get(uid);
            b.totalSpent += t.finalAmount || 0;
            b.txCount += 1;
            if (new Date(t.createdAt) > new Date(b.lastPurchasedAt))
                b.lastPurchasedAt = t.createdAt;
        }
        const buyers = Array.from(buyersMap.values()).sort(
            (a, b) => b.totalSpent - a.totalSpent
        );

        res.render('vendor_view', {
            vendor,
            staff,
            branch,
            users,
            buyers,
            transactions: validTransactions,
        });
    } catch (error) {
        if (error.name === 'CastError') req.flash('red', 'vendor not found!');
        else req.flash('red', error.message);
        res.redirect('/admin/vendor');
    }
};

exports.vendorlogs = async (req, res) => {
    try {
        const vendor = await vendorActivityLog
            .find({ vendorId: req.params.id })
            .populate('vendorId', 'email')
            .sort({ createdAt: -1 })
            .limit(100);
        if (!vendor) {
            req.flash('red', 'vendor not found!');
            return res.redirect('/admin/vendor');
        }

        res.render('vendor_logs', { logs: vendor });
    } catch (error) {
        if (error.name === 'CastError') req.flash('red', 'vendor not found!');
        else req.flash('red', error.message);
        res.redirect('/admin/vendor');
    }
};

exports.changeVendorStatus = async (req, res) => {
    try {
        const user = await vendorModel.findById(req.params.id);

        if (!user) {
            req.flash('red', 'Vendor not found.');
            return res.redirect('/admin/vendor');
        }

        user.isActive = req.params.status;

        await user.save();

        req.flash('green', 'Status changed successfully.');
        res.redirect('/admin/vendor');
    } catch (error) {
        if (error.name === 'CastError' || error.name === 'TypeError')
            req.flash('red', 'User not found!');
        else req.flash('red', error.message);
        res.redirect('/admin/vendor');
    }
};

// exports.approvedVendor = async (req, res) => {
//     try {
//         const user = await vendorModel.findById(req.params.id);

//         user.adminApproved = true;

//         await user.save();

//         let title = 'Welcome! Your Account is Now Approved';
//         const body = 'Congratulations! Your account has been successfully approved. You can now access all features.';
//         const data = {
//             type: 'account_approved'
//         };
//         if (user?.fcmToken) {
//             await sendNotificationsToTokenscheckout(
//                 title,
//                 body,
//                 [user.fcmToken],
//                 data,
//             );
//             await vendorNotificationModel.create({
//                 sentTo: [user?.vendor?._id],
//                 title,
//                 body,
//             });
//         }
//         req.flash('green', 'Vendor application approved successfully.');
//         res.redirect('/admin/vendor/view/' + req.params.id);
//     } catch (error) {
//         if (error.name === 'CastError' || error.name === 'TypeError')
//             req.flash('red', 'vendor not found!');
//         else req.flash('red', error.message);
//         res.redirect('/admin/vendor');
//     }
// };
///////////STATIC VENDOR (ONE VENDOR)
// exports.approvedVendor = async (req, res) => {
//     try {
//         const vendorId = req.params.id;

//         const inputCommission = req.query.commission || req.body.commission || 15;
//         let commission = parseFloat(inputCommission);

//         if (isNaN(commission) || commission < 0 || commission > 50) {
//             req.flash('red', 'Commission must be between 0% and 50%');
//             return res.redirect('back');
//         }

//         const updatedVendor = await vendorModel.findByIdAndUpdate(
//             vendorId,
//             {
//                 $set: {
//                     adminApproved: true,
//                     adminCommissionPercent: commission,
//                     adminCommission: commission,
//                     approvedAt: new Date(),
//                     approvedBy: req.admin?._id || req.user?._id
//                 }
//             },
//             { new: true, runValidators: true }
//         );

//         if (!updatedVendor) {
//             req.flash('red', 'Vendor not found!');
//             return res.redirect('/admin/vendor');
//         }

//         // 1. Email to VENDOR

//         // Email body — send vendor Email (simple styled)

//         const vendorMailBody = `
// <h2>Congratulations! Your Vendor Account Has Been Approved</h2>
// <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333; line-height: 1.6;">

//   <p>Hi <strong>${updatedVendor.businessName || updatedVendor.name}</strong>,</p>

//   <p>
//     Congratulations! Your vendor account has been successfully approved by the Admin.
//     You can now access your vendor dashboard and start managing your products and orders.
//   </p>

//   <div style="background: #f7f7f7; padding: 15px; border-radius: 8px; margin: 15px 0;">
//     <p><strong>Admin Commission:</strong> ${commission}%</p>
//     <p><strong>Vendor Name:</strong> ${updatedVendor.businessName || updatedVendor.name}</p>
//     <p><strong>Approval Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
//   </div>

//   <p>
//     If you have any questions or need further assistance, feel free to reach out to our support team anytime.
//   </p>

//   <p>We’re excited to have you on our platform!</p>

//   <p style="margin-top: 25px;">
//     Best Regards,<br>
//     <strong>Laani Saudi Team</strong>
//   </p>

// </div>
// `;

//         // // Vendor ko email bhejo
//         // await sendEmail(
//         //     updatedVendor.email,
//         //     "Your Vendor Account Approved - Welcome to Laani Saudi!",
//         //     vendorMailBody
//         // );

//         const adminMailBody = `

// <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333; line-height: 1.6;">

//   <p>Hi <strong>${updatedVendor.businessName || ""}</strong>,</p>

//   <p>
//     Congratulations! Your vendor account has been successfully approved by the Admin.
//     You can now access your vendor dashboard and start managing your products and orders.
//   </p>

//   <div style="background: #f7f7f7; padding: 15px; border-radius: 8px; margin: 15px 0;">
//     <p><strong>Admin Commission:</strong> ${commission}%</p>
//     <p><strong>Vendor Name:</strong> ${updatedVendor.businessName || updatedVendor.name}</p>
//     <p><strong>Approval Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
//   </div>

//   <p>
//     If you have any questions or need further assistance, feel free to reach out to our support team anytime.
//   </p>

//   <p>We’re excited to have you on our platform!</p>

//   <p style="margin-top: 25px;">
//     Best Regards,<br>
//     <strong>Laani Saudi Team</strong>
//   </p>

// </div>
// `;
//         // Admin/Team ko email (apna ya team ka email daal sakte ho)
//         await sendEmail(
//             "helly.theappideas@gmail.com",
//             `Congratulations! Your Vendor Account Has Been Approved`,
//             adminMailBody
//         );

//         req.flash('green', `Vendor approved successfully! Commission: ${commission}% | Emails sent to vendor & admin`);
//         res.redirect('/admin/vendor/view/' + vendorId);

//     } catch (error) {
//         console.error('Approve Vendor Error:', error);
//         req.flash('red', error.message || 'Approval failed');
//         res.redirect('/admin/vendor');
//     }
// };

// /// Dynamic Vendor
exports.approvedVendor = async (req, res) => {
    try {
        const vendorId = req.params.id;

        // Commission input
        const inputCommission =
            req.query.commission || req.body.commission || 15;
        let commission = parseFloat(inputCommission);

        if (isNaN(commission) || commission < 0 || commission > 50) {
            req.flash('red', 'Commission must be between 0% and 50%');
            return res.redirect('back');
        }

        // Update vendor in DB
        const updatedVendor = await vendorModel.findByIdAndUpdate(
            vendorId,
            {
                $set: {
                    adminApproved: true,
                    adminCommissionPercent: commission,
                    adminCommission: commission,
                    approvedAt: new Date(),
                    approvedBy: req.admin?._id || req.user?._id,
                },
            },
            { new: true, runValidators: true }
        );

        if (!updatedVendor) {
            req.flash('red', 'Vendor not found!');
            return res.redirect('/admin/vendor');
        }

        // Email body — send vendor Email
        const mailSubject = `Congratulations! Your Vendor Account Has Been Approved`;

        const mailBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333; line-height: 1.6;">

  <p>Hi,</p>

  <p>
    Congratulations! Your vendor account has been successfully approved by the Admin.
    You can now access your vendor dashboard and start managing your products and orders.
  </p>

  <div style="background: #f7f7f7; padding: 15px; border-radius: 8px; margin: 15px 0;">
    <p><strong>Admin Commission:</strong> ${commission}%</p>
    <p><strong>Approval Date:</strong> ${new Date().toLocaleDateString(
        'en-IN'
    )}</p>
  </div>

  <p>
    If you have any questions or need further assistance, feel free to reach out to our support team anytime.
  </p>

  <p>We’re excited to have you on our platform!</p>

  <p style="margin-top: 25px;">
    Best Regards,<br>
    <strong>Laani Saudi Team</strong>
  </p>

</div>
`;

        if (updatedVendor.email) {
            await sendEmail(updatedVendor.email, mailSubject, mailBody);
            console.log('Approval email sent to vendor:', updatedVendor.email);
        } else {
            console.log('Vendor has no email. Email not sent.');
        }

        req.flash(
            'green',
            `Vendor approved successfully! Commission set: ${commission}%. Email sent to vendor.`
        );
        res.redirect('/admin/vendor/view/' + vendorId);
    } catch (error) {
        console.error('Approve Vendor Error:', error);
        req.flash('red', error.message || 'Approval failed');
        res.redirect('/admin/vendor');
    }
};

exports.disapprovedVendor = async (req, res) => {
    try {
        const user = await vendorModel.findById(req.params.id);

        user.adminApproved = false;

        await user.save();

        let title = 'Sorry! Your Account is Not Approved';
        const body =
            'We regret to inform you that your account has not been approved. Please contact admin for further assistance.';
        const data = {
            type: 'account_rejected',
        };
        if (user?.fcmToken) {
            await sendNotificationsToTokenscheckout(
                title,
                body,
                [user.fcmToken],
                data
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

        req.flash('green', 'Vendor application rejected successfully.');
        res.redirect('/admin/vendor/view/' + req.params.id);
    } catch (error) {
        if (error.name === 'CastError' || error.name === 'TypeError')
            req.flash('red', 'vendor not found!');
        else req.flash('red', error.message);
        res.redirect('/admin/vendor');
    }
};

exports.getAddVendor = async (req, res) => {
    try {
        const categories = await businessTypeModel.find({ isDelete: false });

        res.render('vendor_add', { categories, countryCodes });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/vendor');
    }
};

exports.createVendor = async (req, res, next) => {
    try {
        const { businessType, businessName, businessMobile, countryCode } =
            req.body;

        const userExists = await vendorModel.findOne({ email: req.body.email });
        if (userExists) {
            req.flash('red', 'Vendor already exists with thie email.');
            return res.redirect('/admin/vendor');
        }

        // create user
        let user = await vendorModel.create({
            email: req.body.email,
            password: req.body.password,
            language: req.body.language,
            businessName: businessName,
            businessMobile:
                '+' + req.body.countryCode + ' ' + req.body.businessMobile,
            businessLogo: req.files.businessLogo[0].filename,
            businessLicense: req.files.businessLicense[0].filename,
            businessType: businessType,
            adminApproved: true,
        });

        // create Branch if client want;

        const uploadsDir = path.join('./public/uploads');
        const fileName = `${user._id}_qr.png`;
        const filePath = path.join(uploadsDir, fileName);

        // Generate the QR code with the unique ID as the content
        await QRCode.toFile(filePath, user._id.toString(), {
            color: {
                dark: '#000000',
                light: '#ffffff',
            },
        });

        user.qrCode = fileName;
        await user.save();

        req.flash('green', 'Vendor created successfully.');
        res.redirect('/admin/vendor');
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.getEditVendor = async (req, res) => {
    try {
        const vendor = await vendorModel.findById(req.params.id);

        const categories = await businessTypeModel.find({ isDelete: false });

        res.render('vendor_edit', { categories, vendor, countryCodes });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/vendor');
    }
};

exports.editVendor = async (req, res, next) => {
    try {
        const user = await vendorModel.findById(req.params.id);

        user.email = req.body.email;
        user.language = req.body.language;
        user.businessName = req.body.businessName;
        user.businessMobile =
            '+' + req.body.countryCode + ' ' + req.body.businessMobile;
        user.businessType = req.body.businessType;

        if (req.body.password) {
            user.password = req.body.password;
        }
        if (req.files.businessLogo && req.files.businessLogo[0]) {
            user.businessLogo = req.files.businessLogo[0].filename;
        }
        if (req.files.businessLicense && req.files.businessLicense[0]) {
            user.businessLicense = req.files.businessLicense[0].filename;
        }

        await user.save();

        req.flash('green', 'Vendor updated successfully.');
        res.redirect('/admin/vendor');
    } catch (error) {
        next(error);
    }
};

exports.sendNotification = async (req, res) => {
    try {
        const { title, body, selectedUserIds } = req.body;

        const userIds = selectedUserIds.split(',');

        const users = await vendorModel
            .find({
                _id: { $in: userIds },
                isNotification: 1,
            })
            .select('fcmToken')
            .lean();

        const fcmTokens = users.map(user => user.fcmToken);
        const usersWithNotification = users.map(user => user._id);
        const data = {
            type: 'admin_notification',
        };
        await sendNotificationsToTokens(title, body, fcmTokens, data);

        await vendorNotificationModel.create({
            sentTo: usersWithNotification,
            title,
            body,
        });

        req.flash('green', 'Notification sent successfully.');
        res.redirect('/admin/vendor');
    } catch (error) {
        console.log('error: ', error);
        req.flash('red', error.message);
        res.redirect('/admin/vendor');
    }
};

exports.deleteAccountVendor = async (req, res, next) => {
    try {
        const user = await vendorModel.findById(req.params.id);

        const modifiedEmail = `${user.email}_deleted_${Date.now()}`;
        const modifiedMobileNumber = `${
            user.mobileNumber
        }_deleted_${Date.now()}`;

        user.isDelete = true;
        user.token = '';
        user.fcmToken = '';
        user.email = modifiedEmail;
        user.mobileNumber = modifiedMobileNumber;

        //Points Removed

        await user.save();

        // Option A: Soft-delete related discounts
        await discountModel.updateMany(
            { vendor: req.params.id },
            { $set: { isDelete: true } }
        );

        // Option B: Hard delete related discounts (uncomment if you prefer permanent deletion)
        // await discountModel.deleteMany({ vendor: req.params.id });

        // const branch = await branchModel.find({ vendor: req.params.id });
        // branch.forEach(async (branch) => {
        //     branch.isDelete = true;
        //     await branch.save();
        // });

        req.flash('green', 'Vendor deleted successfully.');
        res.redirect('/admin/vendor');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/vendor');
    }
};

/////commision
exports.adminCommission = async (req, res) => {
    const vendorId = req.params.id;
    const { adminCommission } = req.body;

    try {
        await vendorModel.findByIdAndUpdate(vendorId, {
            adminCommission: parseFloat(adminCommission),
        });

        req.flash('green', 'Admin commission updated successfully.');
        res.redirect(`/admin/vendor/view/${vendorId}`);
    } catch (err) {
        console.error(err);
        req.flash('error', 'Something went wrong.');
        res.redirect(`/admin/vendor/view/${vendorId}`);
    }
};

exports.updateCommission = async (req, res) => {
    try {
        const vendorId = req.params.id;
        const { value } = req.query;

        if (!value) {
            console.log('No value provided');
            req.flash('red', 'Commission value required');
            return res.redirect('back');
        }

        const newCommission = parseFloat(value);
        if (isNaN(newCommission) || newCommission < 0 || newCommission > 50) {
            console.log('Invalid commission:', value);
            req.flash('red', 'Commission must be 0-50%');
            return res.redirect('back');
        }

        const updatedVendor = await vendorModel.findByIdAndUpdate(
            vendorId,
            {
                adminCommissionPercent: newCommission,
                adminCommission: newCommission,
            },
            { new: true }
        );

        if (!updatedVendor) {
            console.log('Vendor not found:', vendorId);
            req.flash('red', 'Vendor not found');
            return res.redirect('back');
        }

        console.log(
            `Commission updated: ${updatedVendor.businessName} → ${newCommission}%`
        );

        // Email body
        const mailSubject = `Admin Commission Updated`;
        const mailBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333; line-height: 1.6;">

  <p>Hi <strong>${updatedVendor.businessName || 'Vendor'}</strong>,</p>

  <p>
    This is to inform you that the <strong>admin has updated your commission rate</strong>.
    Please find the updated details below:
  </p>

  <div style="background: #f7f7f7; padding: 15px; border-radius: 8px; margin: 15px 0;">
    <p><strong>Updated Admin Commission:</strong> ${newCommission}%</p>
    <p><strong>Effective Date:</strong> ${new Date().toLocaleDateString(
        'en-IN'
    )}</p>
  </div>

  <p>
    This updated commission will be applied to all future orders.
    If you have any questions or need clarification, please contact our support team.
  </p>

  <p>Thank you for being a valued partner.</p>

  <p style="margin-top: 25px;">
    Best Regards,<br>
    <strong>Laani Saudi Team</strong>
  </p>

</div>
`;

        // Static email
        try {
            await sendEmail(updatedVendor.email, mailSubject, mailBody); // staticEmail
            // console.log(`Email sent to: ${staticEmail}`);
            console.log(`Email sent to vendor: ${updatedVendor.email}`);
        } catch (err) {
            console.log('Vendor email not found. Email not sent.', err.message);
        }

        req.flash('green', `Commission updated to ${newCommission}%!`);
        res.redirect(`/admin/vendor/view/${vendorId}`);
    } catch (error) {
        console.error('Update Commission Error:', error);
        req.flash('red', 'Failed to update commission');
        res.redirect('back');
    }
};
