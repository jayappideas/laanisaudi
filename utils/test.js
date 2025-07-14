const admin = require('firebase-admin');

// Initialize the Firebase Admin SDK
const serviceAccount = require('./laani-saudi-ad975-firebase-adminsdk-fbsvc-324b2e032e.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const sendNotification = async (
     name,
     language,
     registrationToken,
     type,
     data
) => {
     const { title, body } = getNotificationContent(type, language, name);

     const message = {
          notification: { title, body },
          data,
          token: registrationToken,
     };

     try {
          const response = await admin.messaging().send(message);
          // console.log('Successfully sent notification:', title);
          return response;
     } catch (error) {
          console.log('Error sending notification:', error);
          // throw error;
     }
};

const sendNotificationsToTokens = async (title, body, registrationTokens) => {
     // Split registration tokens into batches

     const validTokens = registrationTokens.filter(
          token => token && token.trim() !== ''
     );

     if (validTokens.length === 0) {
          return 'No valid tokens to send notifications.';
     }

     const batchSize = 500;
     const tokenBatches = [];
     for (let i = 0; i < validTokens.length; i += batchSize) {
          tokenBatches.push(validTokens.slice(i, i + batchSize));
     }

     const message = { notification: { title, body } };

     try {
          const sendPromises = tokenBatches.map(batch => {
               const batchMessages = batch.map(token => ({ ...message, token }));
               return admin.messaging().sendEach(batchMessages);
          });

          const response = await Promise.all(sendPromises);

          console.log('sendNotificationsToTokens', JSON.stringify(response));
          return response;
     } catch (error) {
          console.log('Error sending notification:', error);
          throw error;
     }
};

const sendNotificationsToTokenscheckout = async (title, body, registrationTokens, data) => {
     const validTokens = registrationTokens.filter(
          token => token && token.trim() !== ''
     );

     if (validTokens.length === 0) {
          return 'No valid tokens to send notifications.';
     }

     const batchSize = 500;
     const tokenBatches = [];
     for (let i = 0; i < validTokens.length; i += batchSize) {
          tokenBatches.push(validTokens.slice(i, i + batchSize));
     }

     try {
          const sendPromises = tokenBatches.map(batch => {
               const batchMessages = batch.map(token => ({
                    notification: { title, body },
                    data,
                    token
               }));
               return admin.messaging().sendEach(batchMessages);
          });

          const response = await Promise.all(sendPromises);

          // console.log('Successfully sent all messages', JSON.stringify(response));
          return response;
     } catch (error) {
          console.log('Error sending notification:', error);
          throw error;
     }

};

module.exports = {
     sendNotification,
     sendNotificationsToTokens,
     sendNotificationsToTokenscheckout
};
