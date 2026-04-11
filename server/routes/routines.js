import { Router } from 'express';
import { RoutineTask } from '../models/index.js';
import { getChoreStrategy, getKidActivities, DAILY_TIPS } from '../services/adhdStrategies.js';
import { notifyChoreReminder } from '../services/ntfyService.js';
import { getKidSuggestions, shuffleActivities, KIDS } from '../services/kidsConfig.js';

const router = Router();

// GET /api/routines — list routines
router.get('/', async (req, res) => {
  try {
    const { category, active } = req.query;
    const query = {};
    if (category) query.category = category;
    if (active !== undefined) query.isActive = active === 'true';

    const routines = await RoutineTask.find(query).sort({ 'preferredTime.hour': 1 });
    res.json(routines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/routines — create routine
router.post('/', async (req, res) => {
  try {
    const data = { ...req.body };

    // Auto-add ADHD strategy for chores
    if (data.category === 'chore' && !data.adhdStrategy) {
      const choreType = data.name?.toLowerCase().includes('dish') ? 'dishes'
        : data.name?.toLowerCase().includes('laundry') ? 'laundry'
        : data.name?.toLowerCase().includes('cook') ? 'cooking'
        : 'general_cleaning';
      const strategy = getChoreStrategy(choreType);
      data.adhdStrategy = `${strategy.name}: ${strategy.tip}`;
    }

    const routine = new RoutineTask(data);
    await routine.save();
    res.status(201).json(routine);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/routines/:id — update routine
router.put('/:id', async (req, res) => {
  try {
    const routine = await RoutineTask.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!routine) return res.status(404).json({ error: 'Routine not found' });
    res.json(routine);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/routines/:id/complete — mark as complete
router.post('/:id/complete', async (req, res) => {
  try {
    const routine = await RoutineTask.findById(req.params.id);
    if (!routine) return res.status(404).json({ error: 'Routine not found' });

    routine.streak += 1;
    routine.lastCompleted = new Date();
    routine.completionHistory.push({
      date: new Date(),
      durationMinutes: req.body.durationMinutes || null,
      skipped: false,
      notes: req.body.notes || null
    });
    await routine.save();
    res.json(routine);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/routines/:id/skip — skip and reset streak
router.post('/:id/skip', async (req, res) => {
  try {
    const routine = await RoutineTask.findById(req.params.id);
    if (!routine) return res.status(404).json({ error: 'Routine not found' });

    routine.streak = 0;
    routine.completionHistory.push({
      date: new Date(),
      skipped: true,
      notes: req.body.notes || null
    });
    await routine.save();
    res.json(routine);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/routines/strategy/:choreType — get random ADHD strategy
router.get('/strategy/:choreType', (req, res) => {
  const strategy = getChoreStrategy(req.params.choreType);
  res.json(strategy);
});

// GET /api/routines/kid-activities — get activity suggestions (generic)
router.get('/kid-activities', (req, res) => {
  const { energy, weather, count } = req.query;
  const activities = getKidActivities({
    energy: energy || 'indoor',
    weather: weather || 'any',
    count: parseInt(count) || 3
  });
  res.json(activities);
});

// GET /api/routines/kid-suggestions — personalized Rose + Will suggestions
router.get('/kid-suggestions', (req, res) => {
  const { who, count } = req.query;
  if (who) {
    res.json({ activities: shuffleActivities(who, parseInt(count) || 3), kid: KIDS[who] });
  } else {
    res.json(getKidSuggestions());
  }
});

// GET /api/routines/daily-tip — random daily ADHD tip
router.get('/daily-tip', (req, res) => {
  // Use day of year for consistent daily rotation
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const tip = DAILY_TIPS[dayOfYear % DAILY_TIPS.length];
  res.json({ tip });
});

// POST /api/routines/:id/notify — trigger ntfy for specific routine
router.post('/:id/notify', async (req, res) => {
  try {
    const routine = await RoutineTask.findById(req.params.id);
    if (!routine) return res.status(404).json({ error: 'Routine not found' });
    await notifyChoreReminder(routine);
    res.json({ sent: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/routines/:id
router.delete('/:id', async (req, res) => {
  try {
    const routine = await RoutineTask.findByIdAndDelete(req.params.id);
    if (!routine) return res.status(404).json({ error: 'Routine not found' });
    res.json({ message: 'Routine deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/routines/seed-defaults — create default chore routines (idempotent)
router.post('/seed-defaults', async (req, res) => {
  try {
    const results = await seedDefaultRoutines();
    res.status(201).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export async function seedDefaultRoutines() {
  const defaults = [
    {
      name: 'Do the dishes',
      category: 'chore',
      estimatedMinutes: 15,
      preferredTime: { daysOfWeek: [0, 1, 2, 3, 4, 5, 6], hour: 22, flexibility: 'evening' },
      timerEnabled: true,
      timerMinutes: 15
    },
    {
      name: 'Start laundry',
      category: 'chore',
      estimatedMinutes: 5,
      preferredTime: { daysOfWeek: [1, 3, 5], hour: 11, flexibility: 'morning' }
    },
    {
      name: 'Move laundry to dryer',
      category: 'chore',
      estimatedMinutes: 5,
      preferredTime: { daysOfWeek: [1, 3, 5], hour: 12, flexibility: 'afternoon' }
    },
    {
      name: 'Fold laundry',
      category: 'chore',
      estimatedMinutes: 20,
      preferredTime: { daysOfWeek: [1, 3, 5], hour: 14, flexibility: 'afternoon' },
      timerEnabled: true,
      timerMinutes: 20
    },
    {
      name: 'Wipe down kitchen',
      category: 'chore',
      estimatedMinutes: 10,
      preferredTime: { daysOfWeek: [0, 1, 2, 3, 4, 5, 6], hour: 23, flexibility: 'evening' },
      timerEnabled: true,
      timerMinutes: 10
    },
    {
      name: 'Trash walk',
      category: 'chore',
      description: 'Walk through every room with a trash bag',
      estimatedMinutes: 10,
      preferredTime: { daysOfWeek: [2, 5], hour: 20, flexibility: 'evening' }
    }
  ];

  const created = [];
  const skipped = [];

  for (const def of defaults) {
    const exists = await RoutineTask.findOne({ name: def.name });
    if (exists) {
      skipped.push(def.name);
      continue;
    }

    const choreType = def.name.toLowerCase().includes('dish') ? 'dishes'
      : def.name.toLowerCase().includes('laundry') ? 'laundry'
      : 'general_cleaning';
    const strategy = getChoreStrategy(choreType);
    def.adhdStrategy = `${strategy.name}: ${strategy.tip}`;

    const routine = new RoutineTask(def);
    await routine.save();
    created.push(routine);
  }

  return { created, skipped };
}

export default router;
