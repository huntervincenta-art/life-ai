import mongoose from 'mongoose';

const billTransactionSchema = new mongoose.Schema({
  vendor: { type: String, required: true },
  amount: { type: Number, required: true },
  datePaid: { type: Date, required: true },
  category: {
    type: String,
    enum: ['utilities', 'subscriptions', 'insurance', 'rent', 'phone', 'internet', 'groceries', 'medical', 'loan', 'credit_card', 'other'],
    default: 'other'
  },
  paymentMethod: { type: String, default: '' },
  isRecurring: { type: Boolean, default: false },
  emailSubject: { type: String, default: '' },
  emailFrom: { type: String, default: '' },
  emailDate: { type: Date },
  rawSnippet: { type: String, default: '' },
  source: { type: String, enum: ['email_scan', 'manual'], default: 'email_scan' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

// Compound index to prevent duplicates
billTransactionSchema.index({ vendor: 1, amount: 1, datePaid: 1, userId: 1 }, { unique: true });

export default mongoose.model('BillTransaction', billTransactionSchema);
