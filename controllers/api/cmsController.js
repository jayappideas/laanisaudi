 const createError = require('http-errors');
const faqModel = require('../../models/faqModel');
const pageModel = require('../../models/pageModel');


exports.aboutUs = async (req, res, next) => {
    try {
        const content = await pageModel.findOne({ key: "about" }).select('title content');

        res.json({
            success: true,
            message: req.t('success'),
            data: content
        });

    } catch (error) {
        next(error);
    }
};

exports.termCondition = async (req, res, next) => {
    try {
        const content = await pageModel.findOne({ key: "term" }).select('title content');

        res.json({
            success: true,
            message: req.t('success'),
            data: content
        });

    } catch (error) {
        next(error);
    }
};

exports.privacyPolicy = async (req, res, next) => {
    try {
        const content = await pageModel.findOne({ key: "privacy" }).select('title content');

        res.json({
            success: true,
            message: req.t('success'),
            data: content
        });

    } catch (error) {
        next(error);
    }
};

exports.faq = async (req, res, next) => {
    try {
        const content = await faqModel.find().select('question answer');

        res.json({
            success: true,
            message: req.t('success'),
            data: content
        });

    } catch (error) {
        next(error);
    }
};
