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
  lastOpenedAt: { type: Date, default: null },
  plaidAccessTokens: [{
    accessToken: { type: String, required: true },
    itemId: { type: String, required: true },
    institutionName: { type: String, default: 'Unknown' },
    linkedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', userSchema);
