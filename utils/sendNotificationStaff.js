// const admin = require('firebase-admin');

// // Initialize the Firebase Admin SDK for Vendor
// const vendorServiceAccount = require('./laani-saudi-firebase-adminsdk-fbsvc-c5e8c62bd3-staff.json');
// const vendorApp =
//     admin.apps.find(app => app.name === 'vendorApp') ||
//     admin.initializeApp(
//         {
//             credential: admin.credential.cert(vendorServiceAccount),
//         },
//         'vendorApp'
//     );

// // Initialize the Firebase Admin SDK for Staff
// const staffServiceAccount = require('./laani-saudi-firebase-adminsdk-fbsvc-dfa6252a6f-vendor.json');
// const staffApp =
//     admin.apps.find(app => app.name === 'staffApp') ||
//     admin.initializeApp(
//         {
//             credential: admin.credential.cert(staffServiceAccount),
//         },
//         'staffApp'
//     );

// // Initialize the Firebase Admin SDK for User
// const userServiceAccount = require('./laani-saudi-firebase-adminsdk-fbsvc-a4349b10d1-user.json');
// const userApp =
//     admin.apps.find(app => app.name === 'userApp') ||
//     admin.initializeApp(
//         {
//             credential: admin.credential.cert(userServiceAccount),
//         },
//         'userApp'
//     );

// const sendNotificationsToTokens = async (
//     title,
//     body,
//     registrationTokens,
//     appName
// ) => {

//     let app;
//     if (appName === 'vendorApp') {
//         app = vendorApp;
//     } else if (appName === 'staffApp') {
//         app = staffApp;
//     } else if (appName === 'userApp') {
//         app = userApp;
//     }

//     // Split registration tokens into batches
//     const batchSize = 500;
//     const tokenBatches = [];
//     for (let i = 0; i < registrationTokens.length; i += batchSize) {
//         tokenBatches.push(registrationTokens.slice(i, i + batchSize));
//     }

//     const message = { notification: { title, body } };

//     try {
//         const sendPromises = tokenBatches.map(batch => {
//             const batchMessages = batch.map(token => ({ ...message, token }));
//             return app.messaging().sendEach(batchMessages);
//         });

//         const response = await Promise.all(sendPromises);

//         console.log('Successfully sent all messages', response);
//         return response;
//     } catch (error) {
//         console.log('Error sending notification:', error);
//         throw error;
//     }
// };

// module.exports = {
//     sendNotificationsToTokens,
// };
