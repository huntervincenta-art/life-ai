import cron from 'node-cron';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import { sendPushToUser } from '../services/pushService.js';

export function startBillAlertJob() {
  // Daily at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    try {
      const users = await User.find({ scanEnabled: true, pushEnabled: true });

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

        const lines = upcomingVendors.map(v => {
          const daysUntil = Math.ceil((v.nextExpectedDate - now) / (1000 * 60 * 60 * 24));
          const label = daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;
          return `${v.name} $${v.lastAmount || v.averageAmount} ${label}`;
        });

        const sent = await sendPushToUser(user._id, {
          title: 'Bills coming up',
          body: lines.join(', '),
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          url: '/',
          tag: 'bill-alert-daily'
        });

        if (sent > 0) {
          console.log(`[BillAlert] Sent ${upcomingVendors.length} upcoming bill alerts to ${sent} devices for ${user.email}`);
        }
      }
    } catch (err) {
      console.error('[BillAlert] Error:', err.message);
    }
  });

  console.log('[Cron] Bill alert job scheduled (daily 9am)');
}
