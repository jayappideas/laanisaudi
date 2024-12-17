const businessTypeModel = require('../../models/businessTypeModel');


exports.getCategories = async (req, res) => {
    try {
        const categories = await businessTypeModel.find();

        res.render('category', { categories });

    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/');
    }
};

exports.getAddCategory = async (req, res) => {
    try {
        res.render('category_add');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/category');
    }
};

exports.postAddCategory = async (req, res) => {
    try {
        await businessTypeModel.create({
            name: req.body.name,
            image: req.files.image[0].filename
        });

        req.flash('green', 'Category created successfully.');
        res.redirect('/category');
    } 
    catch (error) {
        req.flash('red', error.message);
        res.redirect('/category');
    }
};

exports.getEditCategory = async (req, res) => {
    try {
        const category = await businessTypeModel.findById(req.params.id);
 
        res.render('category_edit', { category });

    } catch (error) {
        if (error.name === 'CastError') req.flash('red', 'banner not found!');
        else req.flash('red', error.message);
        res.redirect('/category');
    }
};

exports.postEditCategory = async (req, res) => {
    try {
        const category = await businessTypeModel.findById(req.params.id);

        category.name = req.body.name;
        category.image = req.files.image ? `${req.files.image[0].filename}` : category.image;

        await category.save();

        req.flash('green', 'Category updated successfully.');
        res.redirect('/category');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/category');
    }
};

exports.updateCategoryStatus = async (req, res) => {
    try {
        const category = await businessTypeModel.findById(req.params.id);

        category.isActive = req.params.status;
        // banner.image = req.files.image ? `${req.files.image[0].filename}` : banner.image;

        await category.save();

        req.flash('green', 'Category status updated successfully.');
        res.redirect('/category');
    } catch (error) {
        if (error.name === 'CastError' || error.name === 'TypeError')
            req.flash('red', 'Category not found!');
        else req.flash('red', error.message);
        res.redirect('/category');
    }
};
