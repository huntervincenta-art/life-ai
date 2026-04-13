import { Router } from 'express';
import PushSubscription from '../models/PushSubscription.js';
import { publicKey, sendPushNotification } from '../services/pushService.js';

const router = Router();

// GET /api/push/vapid-key
router.get('/vapid-key', (req, res) => {
  res.json({ publicKey });
});

// POST /api/push/subscribe
router.post('/subscribe', async (req, res) => {
  try {
    const { subscription, deviceName } = req.body;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint, userId: req.user._id },
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        deviceName: deviceName || '',
        userId: req.user._id
      },
      { upsert: true, new: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[Push] subscribe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/push/unsubscribe
router.delete('/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'endpoint required' });

    await PushSubscription.findOneAndDelete({ endpoint, userId: req.user._id });
    res.json({ success: true });
  } catch (err) {
    console.error('[Push] unsubscribe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/push/test
router.post('/test', async (req, res) => {
  try {
    const subs = await PushSubscription.find({ userId: req.user._id });
    let sent = 0;

    for (const sub of subs) {
      const result = await sendPushNotification(sub, {
        title: 'Life AI',
        body: 'Push notifications are working!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        url: '/'
      });
      if (result.expired) {
        await PushSubscription.findByIdAndDelete(sub._id);
      } else if (result.success) {
        sent++;
      }
    }

    res.json({ sent });
  } catch (err) {
    console.error('[Push] test error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
