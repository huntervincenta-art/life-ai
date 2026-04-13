import cron from 'node-cron';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';

async function sendNtfyNotification(topic, title, message, priority, tags) {
  const server = process.env.NTFY_SERVER || 'https://ntfy.sh';
  try {
    await fetch(`${server}/${topic}`, {
      method: 'POST',
      headers: {
        'Title': title,
        'Priority': priority,
        'Tags': tags,
        'Click': process.env.DEPLOY_URL || ''
      },
      body: message
    });
  } catch (err) {
    console.error('[BillAlert] ntfy send error:', err.message);
  }
}

export function startBillAlertJob() {
  // Daily at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    try {
      const users = await User.find({ scanEnabled: true });

      for (const user of users) {
        const alertDays = user.alertDaysBefore || 3;
        const now = new Date();
        const cutoff = new Date(now.getTime() + alertDays * 24 * 60 * 60 * 1000);

        const upcomingVendors = await Vendor.find({
          userId: user._id,
          isActive: true,
          nextExpectedDate: { $gte: now, $lte: cutoff }
        }).sort({ nextExpectedDate: 1 });

        if (upcomingVendors.length === 0) continue;

        let hasDueSoon = false;
        const lines = upcomingVendors.map(v => {
          const daysUntil = Math.ceil((v.nextExpectedDate - now) / (1000 * 60 * 60 * 24));
          if (daysUntil <= 1) hasDueSoon = true;
          const label = daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'TOMORROW' : `in ${daysUntil} days`;
          return `${v.name}: $${v.lastAmount || v.averageAmount} (${label})`;
        });

        const message = lines.join('\n');
        const priority = hasDueSoon ? 'high' : 'default';
        const topic = user.ntfyTopic || process.env.NTFY_TOPIC || 'life-ai';

        await sendNtfyNotification(
          topic,
          'Life AI — Bills Coming Up',
          message,
          priority,
          'moneybag'
        );

        console.log(`[BillAlert] Sent ${upcomingVendors.length} upcoming bill alerts for ${user.email}`);
      }
    } catch (err) {
      console.error('[BillAlert] Error:', err.message);
    }
  });

  console.log('[Cron] Bill alert job scheduled (daily 9am)');
}
