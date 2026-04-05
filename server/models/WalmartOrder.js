const mongoose = require('mongoose');

const walmartOrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    trim: true,
  },
  orderDate: {
    type: Date,
  },
  rawEmailText: {
    type: String,
  },
  parsedItems: [
    {
      name: String,
      quantity: Number,
      unit: String,
      price: Number,
    },
  ],
  totalAmount: Number,
  deliveryStatus: String,
  processed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('WalmartOrder', walmartOrderSchema);
