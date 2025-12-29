const mongoose = require('mongoose');
const Vendor = require("./vendorModel")

const transactionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        staff: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Staff',
        },
        discount: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Discount',
            default: null,
        },
        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            // required: true,
        },
        items: [
            {
                menuItem: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'MenuItem',
                    required: true,
                },
                quantity: { type: Number, default: 1 },
            },
        ],
        earnedPoints: {
            type: Number, // Points earned from this transaction
            default: 0,
        },
        spentPoints: {
            type: Number, // Points used for discount
            default: 0,
        },
        billAmount: {
            type: Number, // Amount of  bill before discount
            required: true,
        },
        redeemBalancePoint: {
            type: Boolean,
            required: true, // User want to redeem balance point or not
            default: false,
        },
        discountAmount: {
            type: Number, // customer got bill discount...here store discountAmount.
            required: true,
        },
        finalAmount: {
            // The final amount after discount and points redemption need to pay by the user
            type: Number,
            required: true,
        },
        adminCommission: {
            type: Number,
            default: 0,
        },
        tID: {
            type: String, // Transaction ID for payment gateway
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected', 'expired'],
            required: true,
        },
    },
    { timestamps: true }
);

// Pre-save middleware to calculate adminCommission automatically
// transactionSchema.pre('save', function (next) {
//     if (this.finalAmount > 0 && this.status === 'accepted') {
//       this.adminCommission = parseFloat((this.finalAmount * 0.10).toFixed(2));
//     }
//     next();
//   });

// transactionSchema.pre('save', async function (next) {
//     if (this.finalAmount > 0 && this.status === 'accepted') {
//         try {
//             // Fetch vendor's adminCommissionPercent from DB
//             const vendor = await Vendor.findById(this.vendor).select('adminCommissionPercent');
//             if (!vendor) {
//                 console.error('Vendor not found for transaction:', this._id);
//                 return next(new Error('Vendor not found'));
//             }

//             const percent = vendor.adminCommissionPercent || 0; // Default to 0 if not set
//             this.adminCommission = parseFloat((this.finalAmount * (percent / 100)).toFixed(2));
//             console.log(`Admin commission calculated: ${this.adminCommission}% for vendor ${vendorId}`);
//         } catch (error) {
//             console.error('Error calculating admin commission:', error);
//             return next(error);
//         }
//     }
//     next();
// });

transactionSchema.pre('save', async function (next) {
  try {
    if (!this.vendor && this.staff) {
      const staff = await mongoose.model('Staff').findById(this.staff).select('vendor').lean();
      if (staff && staff.vendor) {
        this.vendor = staff.vendor;
        console.log(`AUTO-FILLED VENDOR: ${staff.vendor} from staff ${this.staff}`);
      } else {
        console.log(`STAFF ${this.staff} has NO VENDOR!`);
      }
    }

    if (this.vendor) {
      console.log(`TRANSACTION VENDOR ID: ${this.vendor}`);
    } else {
      console.log(`WARNING: Transaction has NO VENDOR!`);
    }

    next();
  } catch (err) {
    console.error('AUTO-FILL VENDOR ERROR:', err.message);
    next();
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);
