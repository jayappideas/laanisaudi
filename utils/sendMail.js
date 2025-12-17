const Mailjet = require('node-mailjet');

const mailjet = Mailjet.apiConnect(
    process.env.MJ_APIKEY_PUBLIC,
    process.env.MJ_APIKEY_PRIVATE,
    {
        config: {},
        options: {},
    }
);

// ========== Shared Message Generator ==========
const generateEmailBody = (otp, isRegister = false) => {
    return isRegister
        ? `
      <div style="font-family: Helvetica, Arial, sans-serif; min-width: 900px; overflow: auto; line-height: 2;">
        <div style="margin: 50px auto; width: 70%; padding: 20px 0;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://laanisaudi.com/img/Logo%20(1).png" alt="Laani Saudi Logo" style="height: 80px;" />
          </div>
          <p style="font-size: 1.1em;">Hi,</p>
          <p>Thank you for registering with <strong>Laani Saudi</strong>! Use the OTP below to verify your email. This OTP is valid for 5 minutes.</p>
          <h2 style="background: #921CAF; margin: 0 auto; width: max-content; padding: 0 10px; color: #fff; border-radius: 4px;">
            ${otp}
          </h2>
          <p style="font-size: 0.9em;">If you didn’t initiate this request, please ignore this email.</p>
          <p style="font-size: 0.9em;">Regards,<br />Laani Saudi Team</p>
          <hr style="border: none; border-top: 1px solid #eee;" />
        </div>
      </div>
    `
        : `
      <div style="font-family: Helvetica,Arial,sans-serif;min-width:900px;overflow:auto;line-height:2">
        <div style="margin:50px auto;width:70%;padding:20px 0">
          <div style="border-bottom:1px solid #eee">
            <a href="" style="font-size:1.4em;color: #921CAF;text-decoration:none;font-weight:600">Laani Saudi</a>
          </div>
          <p style="font-size:1.1em">Hi,</p>
          <p>Use the following OTP to reset your password. OTP is valid for 5 minutes.</p>
          <h2 style="background: #921CAF;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">${otp}</h2>
          <p style="font-size:0.9em;">Regards,<br />Laani Saudi</p>
          <hr style="border:none;border-top:1px solid #eee" />
        </div>
      </div>
    `;
};

// ========== Send OTP (Reset) ==========
const sendOtp = async (to, otp) => {
    try {
        await mailjet.post('send', { version: 'v3.1' }).request({
            Messages: [
                {
                    From: {
                        Email: process.env.MJ_FROM,
                        Name: process.env.MJ_NAME,
                    },
                    To: [{ Email: to }],
                    Subject: 'Reset Password',
                    HTMLPart: generateEmailBody(otp, false),
                },
            ],
        });
        console.log(`✅ OTP email sent to ${to}`);
    } catch (error) {
        console.error('❌ Error sending reset OTP email:', error);
    }
};

// ========== Send OTP (Register) ==========
const sendOtpRegister = async (to, otp) => {
    try {
        await mailjet.post('send', { version: 'v3.1' }).request({
            Messages: [
                {
                    From: {
                        Email: process.env.MJ_FROM,
                        Name: process.env.MJ_NAME,
                    },
                    To: [{ Email: to }],
                    Subject: 'Laani Saudi: Your OTP Code for Registration',
                    HTMLPart: generateEmailBody(otp, true),
                },
            ],
        });
        console.log(`✅ Registration OTP email sent to ${to}`);
    } catch (error) {
        console.error('❌ Error sending registration OTP email:', error);
    }
};

// ========== Send Admin Error Email ==========
const sendError = async (error) => {
    try {
        await mailjet.post('send', { version: 'v3.1' }).request({
            Messages: [
                {
                    From: {
                        Email: process.env.MJ_FROM,
                        Name: 'System',
                    },
                    To: [{ Email: 'nik.theappideas@gmail.com' }],
                    Subject: 'System Error Notification',
                    HTMLPart: `<pre>${error?.stack || error}</pre>`,
                },
            ],
        });
    } catch (err) {
        console.error('❌ Failed to send error notification email:', err);
    }
};

// ========== SEND CUSTOM EMAIL (Vendor Approval, etc.) ==========
// const sendEmail = async (to, subject, htmlBody) => {
//     try {
//         const request = await mailjet.post('send', { version: 'v3.1' }).request({
//             Messages: [
//                 {
//                     From: {
//                         Email: process.env.MJ_FROM,
//                         Name: process.env.MJ_NAME || "Laani Saudi Admin",
//                     },
//                     To: Array.isArray(to) 
//                         ? to.map(email => ({ Email: email.trim() }))
//                         : [{ Email: to }],
//                     Subject: subject,
//                     HTMLPart: htmlBody,
//                 },
//             ],
//         });
//         console.log(`Email sent successfully to: ${to}`);
//         return request.body;
//     } catch (error) {
//         console.error('Error sending email:', error.statusCode, error.message);
//         throw error; 
//     }
// };

const sendEmail = async (to, subject, htmlBody) => {
    try {
        await mailjet.post("send", { version: 'v3.1' }).request({
            Messages: [
                {
                    From: {
                        Email:process.env.MJ_FROM,
                        Name: "Laani Saudi"
                    },
                    To: [{ Email: to }],
                    Subject: subject,
                    HTMLPart: htmlBody,
                }
            ]
        });
        console.log("Email sent successfully to:", to);
    } catch (error) {
        console.error("Mailjet Error:", error.message);
    }
};
module.exports = {
    sendOtp,
    sendOtpRegister,
    sendError,
    sendEmail
};
