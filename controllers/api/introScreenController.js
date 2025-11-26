const introScreenModel = require('../../models/introScreenModel');

exports.getIntroScreens = async (req, res, next) => {
    try {
        const introScreens = await introScreenModel
            .find({ isActive: true })
            .select('-__v -createdAt -updatedAt')
            .sort({ sort: 'asc' });

        // const formattedData = introScreens.map(screen => ({
        //     _id: screen._id,
        //     image: process.env.IMAGE_URL + screen.image,
        //     description: screen.description,
        //     sort: screen.sort,
        // }));

        res.json({
            success: true,
            message: req.t('success'),
            data: introScreens,
        });
    } catch (error) {
        next(error);
    }
};
