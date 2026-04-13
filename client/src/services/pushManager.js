import { api } from '../lib/api.js';

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('[SW] Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('[SW] Registered:', registration.scope);
    return registration;
  } catch (err) {
    console.error('[SW] Registration failed:', err);
    return null;
  }
}

export async function subscribeToPush(registration) {
  if (!('PushManager' in window)) {
    console.log('[Push] Push not supported');
    return null;
  }

  try {
    const { data } = await api.get('/api/push/vapid-key');
    const vapidKey = data.publicKey;

    // Convert VAPID key to Uint8Array
    const padding = '='.repeat((4 - vapidKey.length % 4) % 4);
    const base64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: outputArray
    });

    await api.post('/api/push/subscribe', {
      subscription: subscription.toJSON(),
      deviceName: navigator.userAgent.includes('iPhone') ? 'iPhone' :
                  navigator.userAgent.includes('Android') ? 'Android' : 'Desktop'
    });

    console.log('[Push] Subscribed successfully');
    return subscription;
  } catch (err) {
    console.error('[Push] Subscription failed:', err);
    return null;
  }
}

export async function checkPushPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestPushPermission() {
  if (!('Notification' in window)) return 'unsupported';
  const permission = await Notification.requestPermission();
  return permission;
}

export async function sendTestPush() {
  const { data } = await api.post('/api/push/test');
  return data;
}
