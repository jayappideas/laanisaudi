const fs = require('fs');
const path = require('path');
const customerModel = require('../../models/customerModel');


exports.getCategories = async (req, res) => {
    try {
        const customer = await customerModel.find({
            isDelete: false,
        });

        res.render('customer', { customer });

    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin');
    }
};

exports.getAddCategory = async (req, res) => {
    try {
        res.render('customer_add');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/customer');
    }
};

exports.postAddCategory = async (req, res) => {
    try {

        await customerModel.create({
            name: req.body.ename,
        });

        req.flash('green', 'Customer type created successfully.');
        res.redirect('/admin/customer');
    }
    catch (error) {
        console.log(error)
        req.flash('red', error.message);
        res.redirect('/admin/customer');
    }
};

exports.getEditCategory = async (req, res) => {
    try {
        const category = await customerModel.findById(req.params.id);

        res.render('customer_edit', { category });

    } catch (error) {
        if (error.name === 'CastError') req.flash('red', 'customer not found!');
        else req.flash('red', error.message);
        res.redirect('/admin/customer');
    }
};

exports.postEditCategory = async (req, res) => {
    try {
        const category = await customerModel.findById(req.params.id);

        category.name = req.body.ename;

        // if (req.file) {
        //     const oldImagePath = path.join(
        //         __dirname,
        //         '../../public/uploads/',
        //         category.image
        //     );
        //     fs.unlink(oldImagePath, () => { });

        //     category.image = req.file.filename;
        // }

        await category.save();

        req.flash('green', 'Customer type updated successfully.');
        res.redirect('/admin/customer');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/customer');
    }
};



exports.deleteCategory = async (req, res) => {
    try {
        const category = await customerModel.findByIdAndUpdate(
            req.params.id,
            {
                isDelete: true,
            }
        );

        req.flash('green', 'Customer type deleted successfully.');
        res.redirect('/admin/customer');
    } catch (error) {
        if (error.name === 'CastError') req.flash('red', 'Customer type not found!');
        else req.flash('red', error.message);
        res.redirect('/admin/customer');
    }
};