const bannerModel = require('../../models/bannerModel');

exports.getBanners = async (req, res) => {
    try {
        const banners = await bannerModel
            .find({ type: 'retail' })
            .sort({ sort: 'asc' });

        res.render('rbanner', { banners, routePrefix: '/banner/retail' });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/');
    }
};

exports.getAddBanner = async (req, res) => {
    try {
        res.render('rbanner_add', { routePrefix: '/banner/retail' });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/banner/retail');
    }
};

exports.postAddBanner = async (req, res) => {
    try {
        await bannerModel.create({
            sort: req.body.sort,
            image: req.files.image[0].filename,
            content: req.body.EnContent, // optional if needed
            type: 'retail',
        });

        req.flash('green', 'Banner created successfully.');
        res.redirect('/banner/retail');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/banner/retail');
    }
};

exports.getEditBanner = async (req, res) => {
    try {
        const banner = await bannerModel.findById(req.params.id);

        res.render('rbanner_edit', { banner, routePrefix: '/banner/retail' });
    } catch (error) {
        if (error.name === 'CastError') req.flash('red', 'Banner not found!');
        else req.flash('red', error.message);
        res.redirect('/banner/retail');
    }
};

exports.postEditBanner = async (req, res) => {
    try {
        const banner = await bannerModel.findById(req.params.id);

        banner.sort = req.body.sort;
        banner.type = 'retail';
        banner.content = req.body.EnContent; // optional if needed
        if (req.files.image) {
            banner.image = req.files.image[0].filename;
        }

        await banner.save();

        req.flash('green', 'Banner updated successfully.');
        res.redirect('/banner/retail');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/banner/retail');
    }
};

exports.getDeleteBanner = async (req, res) => {
    try {
        await bannerModel.findByIdAndDelete(req.params.id);

        req.flash('green', 'Banner deleted successfully.');
        res.redirect('/banner/retail');
    } catch (error) {
        if (error.name === 'CastError' || error.name === 'TypeError') {
            req.flash('red', 'Banner not found!');
        } else {
            req.flash('red', error.message);
        }
        res.redirect('/banner/retail');
    }
};
