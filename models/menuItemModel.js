const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    category : {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true
    },
    name: { 
      type: String,
      required: true
    },
    price: { 
      type: String,
      required: true
    },
    image: { 
      type: String
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = new mongoose.model('MenuItem', menuItemSchema);
