module.exports = (doc, req) => {
    const accepted = ['en', 'ar'];
    const rawLang = req.headers['accept-language']?.split(',')[0];
    const lang = accepted.includes(rawLang) ? rawLang : 'en';

    const spread = doc.toObject ? doc.toObject() : doc;
    const newDoc = { ...spread };

    Object.keys(newDoc).forEach(key => {
        const value = newDoc[key];

        if (value && typeof value === 'object' && value[lang]) {
            // Replace only if language-specific subdocument exists
            newDoc[key] = value[lang];
        }
    });

    return newDoc;
};
