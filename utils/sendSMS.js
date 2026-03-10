const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const createError = require('http-errors');

const validatePhoneNumber = async (number) => {
    try {
        const info = await client.lookups.v1
            .phoneNumbers(number)
            .fetch({ type: ['carrier'] });

        if (info && info.carrier && info.carrier.type === 'mobile') {
            return true;
        } else {
            throw createError.BadRequest('validation.notMobileNumber');
        }
    } catch (error) {
        // Twilio specific errors
        if (error.code === 20404) {
            throw createError.BadRequest('Invalid phone number'); 
        }

        // Invalid number format error
        if (error.code === 21211 || error.code === 21217) {
            throw createError.BadRequest('Invalid phone number format.');
        }

        console.error('Phone validation error:', error);
        throw createError.InternalServerError('Invalid phone number');

        //  throw createError.BadRequest('validation.phoneNumberInvalid');
    }
};

const sendOTP = async function (to, otp) {
    try {
        await validatePhoneNumber(to); // ✅ Validate first

        return await client.messages.create({
            body: `Your OTP is ${otp}. OTP is valid for 5 minutes.`,
            from: process.env.TWILIO_NAME,
            to,
        });
    } catch (error) {
        console.log('error sendOTP TWILIO: ', error);
        throw error;
    }
};

module.exports = {
    sendOTP,
};
