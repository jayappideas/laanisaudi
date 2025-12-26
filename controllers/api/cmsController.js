const createError = require('http-errors');
const multilingual = require('../../utils/multilingual');
const multilingual2 = require('../../utils/multilingual2');
const faqModel = require('../../models/faqModel');
const pageModel = require('../../models/pageModel');
const contactModel = require('../../models/contactModel');
const screenshotModel = require('../../models/screenshotModel');

exports.screenshot = async (req, res, next) => {
    try {
        let page = await screenshotModel.findOne().select('-__v -isActive');
        page = multilingual2(page, req);

        res.json({
            success: true,
            message: req.t('success'),
            data: page,
        });
    } catch (error) {
        next(error);
    }
};

exports.termCondition = async (req, res, next) => {
    try {
        let page = await pageModel
            .findOne({ key: 'term' })
            .select('-__v -key -_id');
        page = multilingual(page, req);

        res.json({
            success: true,
            message: req.t('success'),
            data: page,
        });
    } catch (error) {
        next(error);
    }
};

exports.privacyPolicy = async (req, res, next) => {
    try {
        let page = await pageModel
            .findOne({ key: 'privacy' })
            .select('-__v -key -_id');
        page = multilingual(page, req);

        res.json({
            success: true,
            message: req.t('success'),
            data: page,
        });
    } catch (error) {
        next(error);
    }
};

exports.faq = async (req, res, next) => {
    try {
        let contact = await contactModel
            .findOne()
            .select('-__v -createdAt -updatedAt');
        let page = await faqModel.find().select('-__v -createdAt -updatedAt');
        page = page.map(x => multilingual(x, req));

        const data = {
            email : contact.email,
            faqs : page,
        };
        res.json({
            success: true,
            message: req.t('success'),
            data,
        });
    } catch (error) {
        next(error);
    }
};
