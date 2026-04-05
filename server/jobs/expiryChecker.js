const cron = require('node-cron');
const axios = require('axios');
const PantryItem = require('../models/PantryItem');

function getDaysUntilExpiry(expiryDate) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
}

async function runExpiryCheck() {
  try {
    console.log('[ExpiryChecker] Running expiry check...');

    const items = await PantryItem.find({ status: { $ne: 'expired' } });

    const expiringToday = [];
    const expiringSoon = [];

    for (const item of items) {
      if (!item.estimatedExpiry) continue;

      const days = getDaysUntilExpiry(item.estimatedExpiry);
      let newStatus;

      if (days > 3) {
        newStatus = 'fresh';
      } else if (days >= 1) {
        newStatus = 'use_soon';
        expiringSoon.push(`${item.name} (${days}d)`);
      } else if (days === 0) {
        newStatus = 'expiring_today';
        expiringToday.push(item.name);
      } else {
        newStatus = 'expired';
      }

      if (item.status !== newStatus) {
        item.status = newStatus;
        await item.save();
      }
    }

    // Send ntfy notification if there are items to flag
    if (expiringToday.length > 0 || expiringSoon.length > 0) {
      const topic = process.env.NTFY_TOPIC || 'life-ai';
      const deployUrl = 'https://your-railway-deployment.up.railway.app'; // TODO: update after deploy

      let messageParts = [];
      if (expiringToday.length > 0) {
        messageParts.push(`Expiring TODAY: ${expiringToday.join(', ')}`);
      }
      if (expiringSoon.length > 0) {
        messageParts.push(`Expiring soon: ${expiringSoon.join(', ')}`);
      }

      await axios.post(`https://ntfy.sh/${topic}`, messageParts.join('\n'), {
        headers: {
          Title: 'Life AI — Expiry Alert',
          Priority: expiringToday.length > 0 ? 'high' : 'default',
          Click: deployUrl,
          'Content-Type': 'text/plain',
        },
      });

      console.log('[ExpiryChecker] Notification sent.');
    } else {
      console.log('[ExpiryChecker] No expiring items to report.');
    }
  } catch (err) {
    console.error('[ExpiryChecker] Error:', err.message);
  }
}

function initExpiryChecker() {
  // Run daily at 5:00 PM
  cron.schedule('0 17 * * *', runExpiryCheck);
  console.log('[ExpiryChecker] Scheduled — runs daily at 5:00 PM');
}

module.exports = { initExpiryChecker, runExpiryCheck };
