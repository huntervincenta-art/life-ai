import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  normalizedName: { type: String, required: true },
  category: {
    type: String,
    enum: ['utilities', 'subscriptions', 'insurance', 'rent', 'phone', 'internet', 'groceries', 'medical', 'loan', 'credit_card', 'other'],
    default: 'other'
  },
  averageAmount: { type: Number, default: 0 },
  lastAmount: { type: Number, default: 0 },
  lastPaidDate: { type: Date },
  nextExpectedDate: { type: Date },
  billingCycleDays: { type: Number, default: 30 },
  billingDayOfMonth: { type: Number, default: null },
  confidence: { type: Number, default: 0, min: 0, max: 1 },
  transactionCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

vendorSchema.index({ normalizedName: 1, userId: 1 }, { unique: true });

export default mongoose.model('Vendor', vendorSchema);
