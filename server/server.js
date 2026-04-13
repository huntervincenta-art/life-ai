import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import User from './models/User.js';
import billRoutes from './routes/bills.js';
import settingsRoutes from './routes/settings.js';
import chatRoutes from './routes/chat.js';
import pushRoutes from './routes/push.js';
import { startEmailScanJob } from './jobs/emailScanJob.js';
import { startBillAlertJob } from './jobs/billAlertJob.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

// Default user middleware — find or create user from GMAIL_USER env
app.use('/api', async (req, res, next) => {
  try {
    const email = process.env.GMAIL_USER || 'default@life-ai.local';
    let user = await User.findOne({ email });
    if (!user) {
      try {
        user = await User.create({
          email,
          displayName: email.split('@')[0],
          gmailUser: process.env.GMAIL_USER || '',
          gmailAppPassword: process.env.GMAIL_APP_PASSWORD || '',
          gmailConnected: !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
        });
        console.log(`[Auth] Created default user: ${email}`);
      } catch (createErr) {
        // Handle duplicate key from concurrent requests — just find the existing one
        if (createErr.code === 11000) {
          user = await User.findOne({ email });
        } else {
          throw createErr;
        }
      }
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('[Auth] User middleware error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

// API Routes
app.use('/api/bills', billRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/push', pushRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', project: 'Life AI — Bill Intelligence', timestamp: new Date().toISOString() });
});

// Serve React client in production
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// ─── START SERVER ───

async function start() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to MongoDB');

      // Start cron jobs after DB is connected
      startEmailScanJob();
      startBillAlertJob();
    } catch (err) {
      console.error('MongoDB connection error:', err.message);
      console.log('Starting server without database...');
    }
  } else {
    console.log('No MONGODB_URI set — starting without database');
  }

  app.listen(PORT, () => {
    console.log(`Life AI server running on port ${PORT}`);
  });
}

start();
