const introScreenModel = require('../../models/introScreenModel');

exports.getIntroScreens = async (req, res) => {
    try {
        const introScreens = await introScreenModel.find().sort({ sort: 'asc' });

        res.render('intro_screen', { introScreens });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin');
    }
};

exports.getAddIntroScreen = async (req, res) => {
    try {
        res.render('intro_screen_add');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/intro-screen');
    }
};

exports.postAddIntroScreen = async (req, res) => {
    try {
        await introScreenModel.create({
            sort: req.body.sort || 0,
            title: req.body.title,
            description: req.body.description,
            image: req.files.image[0].filename,
            isActive: req.body.isActive === 'on' || req.body.isActive === 'true',
        });

        req.flash('green', 'Intro screen created successfully.');
        res.redirect('/admin/intro-screen');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/intro-screen');
    }
};

exports.getEditIntroScreen = async (req, res) => {
    try {
        const introScreen = await introScreenModel.findById(req.params.id);

        res.render('intro_screen_edit', { introScreen });
    } catch (error) {
        if (error.name === 'CastError') req.flash('red', 'Intro screen not found!');
        else req.flash('red', error.message);
        res.redirect('/admin/intro-screen');
    }
};

exports.postEditIntroScreen = async (req, res) => {
    try {
        const introScreen = await introScreenModel.findById(req.params.id);

        introScreen.sort = req.body.sort || 0;
        introScreen.title = req.body.title;
        introScreen.description = req.body.description;
        introScreen.isActive = req.body.isActive === 'on' || req.body.isActive === 'true';
        introScreen.image = req.files.image
            ? `${req.files.image[0].filename}`
            : introScreen.image;

        await introScreen.save();

        req.flash('green', 'Intro screen updated successfully.');
        res.redirect('/admin/intro-screen');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/intro-screen');
    }
};

exports.getDeleteIntroScreen = async (req, res) => {
    try {
        await introScreenModel.findByIdAndDelete(req.params.id);

        req.flash('green', 'Intro screen deleted successfully.');
        res.redirect('/admin/intro-screen');
    } catch (error) {
        if (error.name === 'CastError' || error.name === 'TypeError')
            req.flash('red', 'Intro screen not found!');
        else req.flash('red', error.message);
        res.redirect('/admin/intro-screen');
    }
};
