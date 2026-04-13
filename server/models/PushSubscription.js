import mongoose from 'mongoose';

const pushSubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  endpoint: { type: String, required: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  deviceName: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

pushSubscriptionSchema.index({ endpoint: 1, userId: 1 }, { unique: true });

export default mongoose.model('PushSubscription', pushSubscriptionSchema);
