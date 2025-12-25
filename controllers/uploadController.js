const multer = require('multer');

exports.upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, './public/uploads/');
        },
        filename: function (req, file, cb) {
            cb(null, Date.now() + file.originalname.replaceAll(' ', ''));
        },
    }),
    limits: { fileSize: 1024 * 1024 * 10 },
    fileFilter: (req, file, cb) => {
        // reject a file
        if (
            file.mimetype === 'image/jpeg' ||
            file.mimetype === 'image/jpg' ||
            file.mimetype === 'image/png' ||
            // file.mimetype === 'image/heic' ||
            // file.mimetype === 'image/heif' ||
            file.mimetype === 'image/webp' ||
            file.mimetype === 'application/pdf' ||
            file.mimetype === 'application/msword' ||
            file.mimetype === 'application/vnd.ms-excel'
        )
            cb(null, true);
        else cb(new Error('Something went wrong!'), false);
    },
});
