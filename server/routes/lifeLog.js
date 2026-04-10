import { Router } from 'express';
import { LifeLog, Onboarding, Pattern } from '../models/index.js';
import { generatePatterns } from '../services/patternDetector.js';
import { notifyDataCheckin } from '../services/ntfyService.js';

const router = Router();

// GET /api/life/onboarding — get or create onboarding state
router.get('/onboarding', async (req, res) => {
  try {
    let onboarding = await Onboarding.findOne();
    if (!onboarding) {
      onboarding = new Onboarding();
      await onboarding.save();
    }
    res.json(onboarding);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/life/onboarding/start — begin data gathering phase
router.post('/onboarding/start', async (req, res) => {
  try {
    let onboarding = await Onboarding.findOne();
    if (!onboarding) onboarding = new Onboarding();

    onboarding.phase = 'data_gathering';
    onboarding.startedAt = new Date();
    onboarding.endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await onboarding.save();

    // Send first check-in notification
    await notifyDataCheckin();

    res.json(onboarding);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/life/checkin — submit a check-in
router.post('/checkin', async (req, res) => {
  try {
    const now = new Date();
    const logData = {
      ...req.body,
      timestamp: now,
      dayOfWeek: now.getDay(),
      hour: now.getHours()
    };

    const log = new LifeLog(logData);
    await log.save();

    // Update onboarding counter
    const onboarding = await Onboarding.findOne();
    if (onboarding && onboarding.phase === 'data_gathering') {
      onboarding.totalCheckins += 1;
      onboarding.lastCheckinAt = now;

      // Auto-transition if gathering period is over
      if (now >= onboarding.endsAt) {
        onboarding.phase = 'pattern_review';
      }
      await onboarding.save();
    }

    res.status(201).json({ log, onboarding });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/life/logs — list logs with filters
router.get('/logs', async (req, res) => {
  try {
    const { dayOfWeek, startDate, endDate } = req.query;
    const query = {};

    if (dayOfWeek !== undefined) query.dayOfWeek = parseInt(dayOfWeek);
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await LifeLog.find(query).sort({ timestamp: -1 }).limit(200);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/life/logs/stats — aggregated stats
router.get('/logs/stats', async (req, res) => {
  try {
    const [energyByHour, moodByDay, kidsByDay, topActivities] = await Promise.all([
      LifeLog.aggregate([
        { $match: { energy: { $exists: true } } },
        { $group: { _id: '$hour', avgEnergy: { $avg: '$energy' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      LifeLog.aggregate([
        { $match: { mood: { $exists: true } } },
        { $group: { _id: '$dayOfWeek', avgMood: { $avg: '$mood' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      LifeLog.aggregate([
        { $group: { _id: '$dayOfWeek', kidsCount: { $sum: { $cond: ['$kidsPresent', 1, 0] } }, total: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      LifeLog.aggregate([
        { $match: { activity: { $exists: true, $ne: null } } },
        { $group: { _id: '$activity', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.json({ energyByHour, moodByDay, kidsByDay, topActivities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/life/patterns/generate — analyze logs and create patterns
router.post('/patterns/generate', async (req, res) => {
  try {
    const { patterns, totalLogs } = await generatePatterns();

    // Save patterns to DB
    const saved = [];
    for (const p of patterns) {
      const pattern = new Pattern(p);
      await pattern.save();
      saved.push(pattern);
    }

    // Update onboarding
    const onboarding = await Onboarding.findOne();
    if (onboarding) {
      onboarding.patternsGenerated = true;
      onboarding.phase = 'active';
      await onboarding.save();
    }

    res.json({ patterns: saved, totalLogs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/life/patterns — list active patterns
router.get('/patterns', async (req, res) => {
  try {
    const patterns = await Pattern.find({ isActive: true });
    res.json(patterns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/life/patterns/:id — update pattern
router.put('/patterns/:id', async (req, res) => {
  try {
    const update = { ...req.body, source: 'hybrid' };
    const pattern = await Pattern.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!pattern) return res.status(404).json({ error: 'Pattern not found' });
    res.json(pattern);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/life/notify-checkin — manually trigger check-in notification
router.post('/notify-checkin', async (req, res) => {
  try {
    await notifyDataCheckin();
    res.json({ sent: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
