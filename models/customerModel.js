const mongoose = require('mongoose');

const customer = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = new mongoose.model('Customer', customer);
