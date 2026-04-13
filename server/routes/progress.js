import { Router } from 'express';
import { recordCheckIn, getProgressSummary, calculateTaxSaved } from '../services/progressService.js';

const router = Router();

// GET /api/progress
router.get('/', async (req, res) => {
  try {
    const summary = await getProgressSummary(req.user._id);
    res.json(summary);
  } catch (err) {
    console.error('[Progress] get error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/progress/checkin
router.post('/checkin', async (req, res) => {
  try {
    const { type } = req.body;
    if (!type) return res.status(400).json({ error: 'type required' });
    const result = await recordCheckIn(req.user._id, type);
    res.json(result);
  } catch (err) {
    console.error('[Progress] checkin error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/progress/tax-saved
router.get('/tax-saved', async (req, res) => {
  try {
    const total = await calculateTaxSaved(req.user._id);
    res.json({ estimatedTaxSaved: total });
  } catch (err) {
    console.error('[Progress] tax-saved error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
