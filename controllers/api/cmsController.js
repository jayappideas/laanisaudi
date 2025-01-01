 const createError = require('http-errors');
 const multilingual = require('../../utils/multilingual');
const faqModel = require('../../models/faqModel');
const pageModel = require('../../models/pageModel');

exports.termCondition = async (req, res, next) => {
    try {
        let page = await pageModel.findOne({ key: "term" }).select('-__v -key -_id');
        page = multilingual(page, req);

        res.json({
            success: true,
            message: req.t('success'),
            data: page
        });

    } catch (error) {
        next(error);
    }
};

exports.privacyPolicy = async (req, res, next) => {
    try {
        let page = await pageModel.findOne({ key: "privacy" }).select('-__v -key -_id');
        page = multilingual(page, req);

        res.json({
            success: true,
            message: req.t('success'),
            data: page
        });

    } catch (error) {
        next(error);
    }
};

exports.faq = async (req, res, next) => {
    try {
        let page = await faqModel.find().select('-__v -createdAt -updatedAt');
        page = page.map(x => multilingual(x, req));

        res.json({
            success: true,
            message: req.t('success'),
            data: page
        });

    } catch (error) {
        next(error);
    }
};
