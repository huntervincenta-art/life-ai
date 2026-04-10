import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';

import pantryRoutes from './routes/pantry.js';
import lifeLogRoutes from './routes/lifeLog.js';
import routineRoutes from './routes/routines.js';
import orderRoutes from './routes/orders.js';

import { PantryItem, Onboarding, RoutineTask } from './models/index.js';
import { notifyExpiringItem, notifyChoreReminder, notifyDataCheckin } from './services/ntfyService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/pantry', pantryRoutes);
app.use('/api/life', lifeLogRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/orders', orderRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', project: 'Life AI', timestamp: new Date().toISOString() });
});

// Serve React client in production
import fs from 'fs';
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

// ─── CRON JOBS ───

// 1. Daily 9am — expiry check
cron.schedule('0 9 * * *', async () => {
  try {
    console.log('[Cron] Running daily expiry check...');
    const items = await PantryItem.find({
      isConsumed: false,
      isFood: true,
      estimatedExpiry: { $exists: true, $ne: null }
    });

    const now = new Date();
    for (const item of items) {
      const daysLeft = Math.ceil((item.estimatedExpiry - now) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 3 && daysLeft >= 0) {
        await notifyExpiringItem(item, daysLeft);
      }
      // Mark expired items
      if (daysLeft < 0 && !item.isExpired) {
        item.isExpired = true;
        await item.save();
      }
    }
  } catch (err) {
    console.error('[Cron] Expiry check error:', err.message);
  }
});

// 2. Hourly 8am-11pm — data gathering check-in reminder
cron.schedule('0 8-23 * * *', async () => {
  try {
    const onboarding = await Onboarding.findOne();
    if (onboarding?.phase === 'data_gathering') {
      console.log('[Cron] Sending check-in reminder...');
      await notifyDataCheckin();
    }
  } catch (err) {
    console.error('[Cron] Check-in reminder error:', err.message);
  }
});

// 3. Every 30 min — chore reminders
cron.schedule('0,30 * * * *', async () => {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    // Only send at top of hour
    if (now.getMinutes() > 5) return;

    const tasks = await RoutineTask.find({
      isActive: true,
      ntfyEnabled: true,
      'preferredTime.hour': currentHour,
      'preferredTime.daysOfWeek': currentDay
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const task of tasks) {
      // Skip if already completed today
      if (task.lastCompleted && new Date(task.lastCompleted) >= today) continue;
      await notifyChoreReminder(task);
    }
  } catch (err) {
    console.error('[Cron] Chore reminder error:', err.message);
  }
});

// ─── START SERVER ───

async function start() {
  // Connect to MongoDB (graceful fallback)
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to MongoDB');
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
