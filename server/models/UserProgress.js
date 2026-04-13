import mongoose from 'mongoose';

const userProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  totalBillsTracked: { type: Number, default: 0 },
  totalAmountTracked: { type: Number, default: 0 },
  estimatedTaxSaved: { type: Number, default: 0 },
  cancelledSubscriptions: { type: Number, default: 0 },
  cancelledSavingsMonthly: { type: Number, default: 0 },
  checkIns: [{
    date: { type: Date, default: Date.now },
    type: { type: String, enum: ['app_open', 'bill_added', 'bill_paid', 'scan_triggered', 'chat_completed', 'vendor_cancelled'] }
  }],
  weeklyCheckIns: { type: Number, default: 0 },
  currentWeekStart: { type: Date },
  badges: [{
    id: String,
    name: String,
    description: String,
    icon: String,
    earnedAt: Date
  }],
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('UserProgress', userProgressSchema);
