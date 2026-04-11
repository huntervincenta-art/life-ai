const BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// ─── Pantry ───
export const pantry = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/pantry${q ? `?${q}` : ''}`);
  },
  stats: () => request('/pantry/stats'),
  add: (item) => request('/pantry', { method: 'POST', body: JSON.stringify(item) }),
  update: (id, data) => request(`/pantry/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  consume: (id) => request(`/pantry/${id}/consume`, { method: 'POST' }),
  remove: (id) => request(`/pantry/${id}`, { method: 'DELETE' }),
  syncGmail: (emails) => request('/pantry/sync-gmail', { method: 'POST', body: JSON.stringify({ emails }) }),
  expiringIngredients: () => request('/pantry/expiring-ingredients'),
  availableFood: () => request('/pantry/available-food'),
  sync: () => request('/pantry/sync', { method: 'POST' }),
  syncStatus: () => request('/pantry/sync-status'),
};

// ─── Life / Onboarding ───
export const life = {
  getOnboarding: () => request('/life/onboarding'),
  startOnboarding: () => request('/life/onboarding/start', { method: 'POST' }),
  checkin: (data) => request('/life/checkin', { method: 'POST', body: JSON.stringify(data) }),
  getLogs: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/life/logs${q ? `?${q}` : ''}`);
  },
  getLogStats: () => request('/life/logs/stats'),
  generatePatterns: () => request('/life/patterns/generate', { method: 'POST' }),
  getPatterns: () => request('/life/patterns'),
  updatePattern: (id, data) => request(`/life/patterns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  notifyCheckin: () => request('/life/notify-checkin', { method: 'POST' }),
  seedPatterns: () => request('/life/patterns/seed', { method: 'POST' }),
  getCustody: (weeks = 4) => request(`/life/custody?weeks=${weeks}`),
};

// ─── Routines ───
export const routines = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/routines${q ? `?${q}` : ''}`);
  },
  create: (data) => request('/routines', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/routines/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  complete: (id, data = {}) => request(`/routines/${id}/complete`, { method: 'POST', body: JSON.stringify(data) }),
  skip: (id, data = {}) => request(`/routines/${id}/skip`, { method: 'POST', body: JSON.stringify(data) }),
  remove: (id) => request(`/routines/${id}`, { method: 'DELETE' }),
  getStrategy: (type) => request(`/routines/strategy/${type}`),
  getKidActivities: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/routines/kid-activities${q ? `?${q}` : ''}`);
  },
  getDailyTip: () => request('/routines/daily-tip'),
  getKidSuggestions: () => request('/routines/kid-suggestions'),
  notify: (id) => request(`/routines/${id}/notify`, { method: 'POST' }),
  seedDefaults: () => request('/routines/seed-defaults', { method: 'POST' }),
};

// ─── Orders ───
export const orders = {
  list: () => request('/orders'),
};

// ─── Health ───
export const health = () => request('/health');
