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
          token: registrationToken,
          notification: { title, body },
          data,
          apns: {
               headers: {
                    'apns-priority': '10'
               },
               payload: {
                    aps: {
                         alert: {
                              title,
                              body
                         },
                         sound: 'default',
                         badge: 1,
                         'content-available': 1
                    }
               }
          }
     };

     try {
          const response = await admin.messaging().send(message);
          console.log('sendNotification: ', response);
          console.log('==============================')

          return response;
     } catch (error) {
          console.log('Error sending notification:', error?.message || error);
          // throw error;
     }
};


const sendNotificationsToTokens = async (title, body, registrationTokens, data) => {
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

     // Full message template
     const baseMessage = {
          notification: { title, body },
          data,
          apns: {
               headers: {
                    'apns-priority': '10'
               },
               payload: {
                    aps: {
                         alert: {
                              title,
                              body
                         },
                         sound: 'default',
                         badge: 1,
                         'content-available': 1
                    }
               }
          }
     };

     try {
          const sendPromises = tokenBatches.map(batch => {
               const batchMessages = batch.map(token => ({
                    ...baseMessage,
                    token
               }));

               return admin.messaging().sendEach(batchMessages);
          });

          const response = await Promise.all(sendPromises);

          console.log('sendNotificationsToTokens', JSON.stringify(response));
          console.log('==============================')

          return response;
     } catch (error) {
          console.log('Error sending notification:', error?.message || error);
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
                    token,
                    notification: { title, body },
                    data,
                    apns: {
                         headers: {
                              'apns-priority': '10',
                         },
                         payload: {
                              aps: {
                                   alert: {
                                        title,
                                        body
                                   },
                                   sound: 'default',
                                   badge: 1,
                                   'content-available': 1
                              }
                         }
                    }
               }));

               return admin.messaging().sendEach(batchMessages);
          });

          const response = await Promise.all(sendPromises);
          console.log('response sendNotificationsToTokenscheckout..  ', response);
          console.log('==============================')

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
