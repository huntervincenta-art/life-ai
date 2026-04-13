import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';

let publicKey = process.env.VAPID_PUBLIC_KEY || '';
let privateKey = process.env.VAPID_PRIVATE_KEY || '';

// Generate VAPID keys if not set
if (!publicKey || !privateKey) {
  const keys = webpush.generateVAPIDKeys();
  publicKey = keys.publicKey;
  privateKey = keys.privateKey;
  console.log('[Push] VAPID keys not found in env. Generated new keys — add these to your Railway variables:');
  console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
}

webpush.setVapidDetails(
  'mailto:' + (process.env.GMAIL_USER || 'admin@life-ai.local'),
  publicKey,
  privateKey
);

export { publicKey };

export async function sendPushNotification(subscription, payload) {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys
      },
      JSON.stringify(payload)
    );
    return { success: true };
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      return { expired: true };
    }
    console.error('[Push] Send error:', err.message);
    return { error: err.message };
  }
}

export async function sendPushToUser(userId, payload) {
  const subscriptions = await PushSubscription.find({ userId });
  let sent = 0;

  for (const sub of subscriptions) {
    const result = await sendPushNotification(sub, payload);
    if (result.expired) {
      await PushSubscription.findByIdAndDelete(sub._id);
      console.log(`[Push] Removed expired subscription for endpoint ${sub.endpoint.substring(0, 50)}...`);
    } else if (result.success) {
      sent++;
    }
  }

  return sent;
}
