const Admin = require('../../models/adminModel');

exports.getAdminDetails = async (req, res) => {
    try {
        const admin = await Admin.findOne({ email: 'admin@gmail.com' });
        if (!admin)
            return res
                .status(404)
                .json({ success: false, message: 'Admin not found' });
        res.render('admin_details', {
            title: 'Admin Details',
            admin,
            messages: req.flash(),
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateAdminDetails = async (req, res) => {
    try {
        const updateFields = {
            companyName: req.body.companyName,
            companyAddress: req.body.companyAddress,
            bankName: req.body.bankName,
            branch: req.body.branch,
            ifsc: req.body.ifsc,
            accountNumber: req.body.accountNumber,
            gstNumber: req.body.gstNumber,
            pan: req.body.pan,
            phone: req.body.phone,
            emailPDF: req.body.emailPDF,
        };
        const admin = await Admin.findOneAndUpdate(
            { email: 'admin@gmail.com' },
            updateFields,
            {
                new: true,
            }
        );
        if (!admin)
            return res
                .status(404)
                .json({ success: false, message: 'Admin not found' });

        req.flash('green', 'Data updated successfully.');
        res.redirect('/admin/details');
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
