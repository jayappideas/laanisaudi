const mongoose = require('mongoose');

const vendorActivityLogSchema = new mongoose.Schema(
     {
          vendorId: {
               type: mongoose.Schema.Types.ObjectId,
               ref: 'Vendor',
               required: true,
          },
          action: {
               type: String,
               enum: [
                    'LOGIN',
                    'MENU_CREATED',
                    'MENU_UPDATED',
                    'MENU_DELETED',
                    'DISCOUNT_CREATED',
                    'DISCOUNT_UPDATED',
                    'DISCOUNT_DELETED',
                    'STAFF_CREATED',
                    'STAFF_UPDATED',
                    'STAFF_DELETED',
                    'BRANCH_CREATED',
                    'BRANCH_UPDATED',
                    'BRANCH_DELETED',
               ],
               required: true,
          },
          targetRef: {
               type: mongoose.Schema.Types.ObjectId,
               refPath: 'targetModel',
               default: null,
          },
          targetModel: {
               type: String,
               enum: ['Offer', 'Staff', 'Vendor', 'Discount', 'MenuItem', 'Branch'], // models this action relates to
               default: null,
          },
          meta: {
               type: mongoose.Schema.Types.Mixed, // to store any extra info like offer title or staff name
          },
          expireAt: {
               type: Date,
               expires: 0,
               default: () => new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // Expires after 60 days
          },
     },
     { timestamps: true }
);
vendorActivityLogSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 }); // Set up TTL index

module.exports = new mongoose.model('vendorActivityLog', vendorActivityLogSchema);
