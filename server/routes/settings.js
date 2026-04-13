import { Router } from 'express';
import { testConnection } from '../services/emailScanner.js';

const router = Router();

// POST /api/settings/gmail — save Gmail credentials
router.post('/gmail', async (req, res) => {
  try {
    const { gmailUser, gmailAppPassword } = req.body;
    if (!gmailUser || !gmailAppPassword) {
      return res.status(400).json({ error: 'gmailUser and gmailAppPassword required' });
    }

    // Test the connection first
    const result = await testConnection(gmailUser, gmailAppPassword);

    if (result.success) {
      req.user.gmailUser = gmailUser;
      req.user.gmailAppPassword = gmailAppPassword;
      req.user.gmailConnected = true;
      await req.user.save();
      res.json({ success: true, message: 'Gmail connected successfully' });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (err) {
    console.error('[Settings] gmail error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    res.json({
      scanEnabled: req.user.scanEnabled,
      alertDaysBefore: req.user.alertDaysBefore,
      ntfyTopic: req.user.ntfyTopic,
      gmailConnected: req.user.gmailConnected || !!(req.user.gmailUser || process.env.GMAIL_USER),
      gmailUser: req.user.gmailUser || process.env.GMAIL_USER || '',
      lastScanAt: req.user.lastScanAt
    });
  } catch (err) {
    console.error('[Settings] get error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/settings
router.patch('/', async (req, res) => {
  try {
    const allowed = ['scanEnabled', 'alertDaysBefore', 'ntfyTopic'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) req.user[key] = req.body[key];
    }
    await req.user.save();
    res.json({ success: true });
  } catch (err) {
    console.error('[Settings] update error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
