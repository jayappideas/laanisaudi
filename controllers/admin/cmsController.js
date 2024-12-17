const deleteFile = require('../../utils/deleteFile');

const Page = require('../../models/pageModel.js');
const faqModel = require('../../models/faqModel.js');

exports.getAbout = async (req, res) => {
    try {
        const page = await Page.findOne({ key: 'about' });

        res.render('about', { page });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/');
    }
};

exports.postAbout = async (req, res) => {
    try {
        const page = await Page.findOne({ key: 'about' });

        page.title = req.body.EnTitle;
        page.content = req.body.EnContent;

        // if (req.files.image) {
        //     deleteFile(page.image);
        //     page.image = `/uploads/${req.files.image[0].filename}`;
        // }

        await page.save();

        req.flash('green', 'About us updated successfully.');
        res.redirect('/cms/about');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect(req.originalUrl);
    }
};

exports.getPrivacy = async (req, res) => {
    try {
        const page = await Page.findOne({ key: 'privacy' });

        res.render('privacy', { page });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/');
    }
};

exports.postPrivacy = async (req, res) => {
    try {
        const page = await Page.findOne({ key: 'privacy' });

        page.title = req.body.EnTitle;
        page.content = req.body.EnContent;

        await page.save();

        req.flash('green', 'Privacy Policy updated successfully.');
        res.redirect('/cms/privacy');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect(req.originalUrl);
    }
};

exports.getTerm = async (req, res) => {
    try {
        const page = await Page.findOne({ key: 'term' });

        res.render('term', { page });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/');
    }
};

exports.postTerm = async (req, res) => {
    try {
        const page = await Page.findOne({ key: 'term' });

        page.title = req.body.EnTitle;
        page.content = req.body.EnContent;

        await page.save();

        req.flash('green', 'Terms & Condition updated successfully.');
        res.redirect('/cms/term');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect(req.originalUrl);
    }
};

exports.getFaq = async (req, res) => {
    try {
        const faqs = await faqModel.find();

        res.render('faq', { faqs });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/');
    }
};


exports.getFaqAdd = async (req, res) => {
  
    res.render('faq_add');
  
};

exports.postFaqAdd = async (req, res) => {
    try {

        await faqModel.create({
            question: req.body.question,
            answer: req.body.answer,
        });

        req.flash('green', 'Faq added successfully.');
        res.redirect('/cms/faq');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect(req.originalUrl);
    }
};

exports.getFaqUpdate = async (req, res) => {
    const faq = await faqModel.findById(req.params.id);

    res.render('faq_edit', { faq } );
};

exports.postFaqUpdate = async (req, res) => {
    try {
        const faq = await faqModel.findById(req.params.id);

        faq.question = req.body.question;
        faq.answer = req.body.answer;

        await faq.save();

        req.flash('green', 'Faq updated successfully.');
        res.redirect('/cms/faq');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect(req.originalUrl);
    }
};

exports.getFaqDelete = async (req, res) => {
    try {
        await faqModel.findByIdAndDelete(req.params.id);

        req.flash('green', 'Faq deleted successfully.');
        res.redirect('/cms/faq');
    } catch (error) {
        console.log(error)
        req.flash('red', error.message);
        res.redirect(req.originalUrl);
    }
};