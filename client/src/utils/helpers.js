export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export function getExpiryClass(days) {
  if (days === null) return 'expiry-none';
  if (days <= 0) return 'expiry-danger';
  if (days <= 3) return 'expiry-warning';
  return 'expiry-ok';
}

export function getExpiryLabel(days) {
  if (days === null) return 'No expiry';
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return 'Expires today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

export const CATEGORY_EMOJI = {
  produce: '🥬',
  dairy: '🥛',
  meat: '🥩',
  frozen: '🧊',
  pantry: '🥫',
  beverage: '🥤',
  snack: '🍿',
  household: '🧹',
  pet: '🐕',
  personal_care: '🧴',
  other: '📦'
};

export function formatDate(dateStr) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

export function formatTime(dateStr) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function energyEmoji(level) {
  return ['', '😴', '😐', '🙂', '⚡', '🔥'][level] || '';
}

export function moodEmoji(level) {
  return ['', '😞', '😕', '😊', '😄', '🤩'][level] || '';
}
