import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  displayName: { type: String, default: '' },
  gmailConnected: { type: Boolean, default: false },
  gmailUser: { type: String, default: '' },
  gmailAppPassword: { type: String, default: '' },
  pushEnabled: { type: Boolean, default: true },
  lastScanAt: { type: Date, default: null },
  scanEnabled: { type: Boolean, default: true },
  alertDaysBefore: { type: Number, default: 3 },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', userSchema);
