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
        if (error.code === 20404) {
            throw createError.BadRequest('validation.phoneInvalid'); // number not found
        }
        throw createError.InternalServerError('lookup.failed');
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
