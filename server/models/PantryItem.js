const mongoose = require('mongoose');

const pantryItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    enum: [
      'Produce',
      'Meat & Seafood',
      'Dairy & Eggs',
      'Frozen',
      'Pantry Staples',
      'Beverages',
      'Snacks',
      'Leftovers',
      'Other',
    ],
    default: 'Other',
  },
  quantity: {
    type: Number,
    default: 1,
  },
  unit: {
    type: String,
    trim: true,
  },
  purchaseDate: {
    type: Date,
    default: Date.now,
  },
  estimatedExpiry: {
    type: Date,
  },
  expiryDays: {
    type: Number,
  },
  source: {
    type: String,
    enum: ['walmart_order', 'manual', 'photo_scan'],
    default: 'manual',
  },
  status: {
    type: String,
    enum: ['fresh', 'use_soon', 'expiring_today', 'expired'],
    default: 'fresh',
  },
  notes: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('PantryItem', pantryItemSchema);
