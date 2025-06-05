const admin = require('firebase-admin');

// Initialize the Firebase Admin SDK
const serviceAccount = require('./laani-saudi-firebase-adminsdk-fbsvc-dfa6252a6f-vendor.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const sendNotificationsToTokens = async (
    title,
    body,
    registrationTokens,
) => {
    // Split registration tokens into batches
    const batchSize = 500;
    const tokenBatches = [];
    for (let i = 0; i < registrationTokens.length; i += batchSize) {
        tokenBatches.push(registrationTokens.slice(i, i + batchSize));
    }

    const message = { notification: { title, body } };

    try {
        const sendPromises = tokenBatches.map(batch => {
            const batchMessages = batch.map(token => ({ ...message, token }));
            return admin.messaging().sendEach(batchMessages);
        });

        const response = await Promise.all(sendPromises);

        console.log('Successfully sent all messages');
        return response;
    } catch (error) {
        console.log('Error sending notification:', error);
        throw error;
    }
};

module.exports = {
    sendNotificationsToTokens,
};
