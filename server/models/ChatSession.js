import mongoose from 'mongoose';

const chatSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['active', 'completed', 'abandoned'], default: 'active' },
  messages: [{
    role: { type: String, enum: ['assistant', 'user'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  billsExtracted: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  timerMinutes: { type: Number, default: 20 }
});

export default mongoose.model('ChatSession', chatSessionSchema);
