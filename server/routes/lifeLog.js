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

// POST /api/life/patterns/seed — seed personal patterns (idempotent)
router.post('/patterns/seed', async (req, res) => {
  try {
    const results = await seedPatterns();
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/life/custody — custody schedule info for calendar
router.get('/custody', (req, res) => {
  const { weeks } = req.query;
  const numWeeks = parseInt(weeks) || 4;
  const today = new Date();
  const result = [];

  for (let w = 0; w < numWeeks; w++) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + (w * 7)); // Sunday of each week
    weekStart.setHours(0, 0, 0, 0);

    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + d);
      const dayOfWeek = date.getDay();

      const custody = getCustodyForDate(date);
      days.push({
        date: date.toISOString().split('T')[0],
        dayOfWeek,
        ...custody
      });
    }

    const satDate = new Date(weekStart);
    satDate.setDate(weekStart.getDate() + 6);
    const weekInfo = getCustodyWeek(satDate);

    result.push({
      weekNumber: weekInfo.weekNumber,
      isMyWeekend: weekInfo.isMyWeekend,
      days
    });
  }

  res.json(result);
});

// ─── Custody Helpers ───

function getCustodyWeek(date) {
  const anchorDate = new Date('2026-03-28T00:00:00');
  const anchorWeekNumber = 4;
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;

  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const saturday = new Date(d);
  saturday.setDate(d.getDate() + (6 - dayOfWeek));
  saturday.setHours(0, 0, 0, 0);

  const anchorSat = new Date(anchorDate);
  anchorSat.setHours(0, 0, 0, 0);

  const weeksDiff = Math.round((saturday - anchorSat) / msPerWeek);
  const cycleWeek = ((weeksDiff % 4) + 4) % 4;
  const actualWeek = ((cycleWeek + anchorWeekNumber - 1) % 4) + 1;

  return {
    weekNumber: actualWeek,
    isMyWeekend: actualWeek !== 4,
    isMomsWeekend: actualWeek === 4
  };
}

function getCustodyForDate(date) {
  const dayOfWeek = date.getDay();
  const weekInfo = getCustodyWeek(date);

  // Monday & Wednesday afternoons are ALWAYS mine (3:30-7pm)
  const isWeekdayAfternoon = (dayOfWeek === 1 || dayOfWeek === 3);

  // Weekend custody: Fri 3:30pm → Mon 8am (includes Fri, Sat, Sun, Mon morning)
  const isWeekendCustodyDay = (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0);
  const isMondayMorning = dayOfWeek === 1; // Kids are still here Mon morning until 8am
  const hasKidsWeekend = (isWeekendCustodyDay || isMondayMorning) && weekInfo.isMyWeekend;

  let custodyHours = null;
  if (hasKidsWeekend) {
    if (dayOfWeek === 5) custodyHours = 'From 3:30pm';
    else if (dayOfWeek === 1) custodyHours = 'Until 8am';
    else custodyHours = 'All day';
  } else if (isWeekdayAfternoon) {
    custodyHours = '3:30pm-7pm';
  }

  return {
    hasKids: hasKidsWeekend || isWeekdayAfternoon,
    isWeekdayAfternoon,
    isWeekendCustody: hasKidsWeekend,
    isMomsWeekend: isWeekendCustodyDay && weekInfo.isMomsWeekend,
    custodyHours
  };
}

// ─── Pattern Seeding ───

export async function seedPatterns() {
  const SEED_PATTERNS = [
    {
      name: 'Kids custody - weekends',
      type: 'custody',
      schedule: {
        daysOfWeek: [5, 6, 0, 1], // Fri 3:30pm → Mon 8am
        startHour: 15, // Fri 3:30pm pickup
        endHour: 8, // Mon 8am dropoff
        frequency: 'custom'
      },
      metadata: {
        cycle: '3 weekends on, 1 weekend off, 4-week rotation',
        cycleAnchorDate: '2026-03-28',
        cycleWeekNumber: 4,
        pickup: 'Friday 3:30pm',
        dropoff: 'Monday 8:00am (mom drives to school)',
        weekdayVisits: 'Monday and Wednesday 3:30pm-7pm every week regardless of weekend',
        kids: 'Rose (7) and Will (5)'
      },
      confidenceScore: 1.0,
      source: 'user_input',
      isActive: true
    },
    {
      name: 'Kids custody - weekday afternoons',
      type: 'custody',
      schedule: {
        daysOfWeek: [1, 3],
        startHour: 15,
        endHour: 19,
        frequency: 'weekly'
      },
      confidenceScore: 1.0,
      source: 'user_input',
      isActive: true
    },
    {
      name: 'Work schedule',
      type: 'work',
      schedule: {
        daysOfWeek: [1, 2, 3, 4, 5],
        startHour: 10,
        endHour: 18,
        frequency: 'weekdays'
      },
      metadata: {
        style: 'Flexible/remote, content creation for MFS',
        note: 'No fixed hours, generally working during the day'
      },
      confidenceScore: 0.6,
      source: 'user_input',
      isActive: true
    },
    {
      name: 'Sleep schedule',
      type: 'sleep',
      schedule: {
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        startHour: 1,
        endHour: 10,
        frequency: 'daily'
      },
      confidenceScore: 0.9,
      source: 'user_input',
      isActive: true
    }
  ];

  const created = [];
  const skipped = [];

  for (const p of SEED_PATTERNS) {
    const exists = await Pattern.findOne({ name: p.name });
    if (exists) {
      skipped.push(p.name);
      continue;
    }
    const pattern = new Pattern(p);
    await pattern.save();
    created.push(p.name);
  }

  return { created, skipped };
}

export default router;
