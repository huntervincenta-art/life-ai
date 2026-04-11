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

import { PantryItem, Onboarding, RoutineTask, Pattern } from './models/index.js';
import { notifyExpiringItem, notifyChoreReminder, notifyDataCheckin } from './services/ntfyService.js';
import { seedPatterns } from './routes/lifeLog.js';
import { seedDefaultRoutines } from './routes/routines.js';
import { syncWalmartOrders, getSyncLog } from './services/gmailSync.js';

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

// Test ntfy notification
app.get('/api/test-ntfy', async (req, res) => {
  try {
    const { sendNotification } = await import('./services/ntfyService.js');
    const success = await sendNotification({
      title: 'Life AI Test',
      message: 'If you see this, ntfy is working!',
      priority: 3,
      tags: ['white_check_mark']
    });
    res.json({ success, topic: process.env.NTFY_TOPIC || 'life-ai-hunter', server: process.env.NTFY_SERVER || 'https://ntfy.sh' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Debug: sync log viewer
app.get('/api/debug/sync-log', (req, res) => {
  res.json(getSyncLog());
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

// 1. Daily 11am — expiry check (night owl schedule)
cron.schedule('0 11 * * *', async () => {
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

// 2. Hourly 10am-11pm — data gathering check-in reminder (no pings before 10am)
cron.schedule('0 10-23 * * *', async () => {
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

    // Only send at top of hour, and not before 10am
    if (now.getMinutes() > 5) return;
    if (currentHour < 10) return;

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

// 4. Every 30 min — Gmail Walmart sync
cron.schedule('*/30 * * * *', async () => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return;
  try {
    const result = await syncWalmartOrders();
    if (result.newOrders > 0) {
      console.log(`[Cron] Gmail sync: ${result.newOrders} new orders, ${result.newItems} items added`);
    }
  } catch (err) {
    console.error('[Cron] Gmail sync failed:', err.message);
  }
});

// ─── START SERVER ───

async function start() {
  // Connect to MongoDB (graceful fallback)
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to MongoDB');

      // Auto-seed patterns and routines if collections are empty
      try {
        const patternCount = await Pattern.countDocuments();
        if (patternCount === 0) {
          const pResult = await seedPatterns();
          console.log(`[Seed] Patterns: created ${pResult.created.length}`);
        }
        const routineCount = await RoutineTask.countDocuments();
        if (routineCount === 0) {
          const rResult = await seedDefaultRoutines();
          console.log(`[Seed] Routines: created ${rResult.created.length}`);
        }
      } catch (seedErr) {
        console.error('[Seed] Error:', seedErr.message);
      }

      // Initial Gmail sync on startup
      if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        syncWalmartOrders()
          .then(r => {
            if (r.newOrders > 0) console.log(`[Startup] Gmail sync: ${r.newOrders} orders, ${r.newItems} items`);
            else console.log('[Startup] Gmail sync: no new orders');
          })
          .catch(err => console.error('[Startup] Gmail sync failed:', err.message));
      }
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
