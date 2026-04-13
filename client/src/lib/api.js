import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || ''
});

// Bills
export const getTimeline = () => api.get('/api/bills/timeline').then(r => r.data);
export const getHistory = (params) => api.get('/api/bills/history', { params }).then(r => r.data);
export const getSummary = () => api.get('/api/bills/summary').then(r => r.data);
export const addBill = (data) => api.post('/api/bills', data).then(r => r.data);
export const updateTransaction = (id, data) => api.patch(`/api/bills/transaction/${id}`, data).then(r => r.data);
export const deleteTransaction = (id) => api.delete(`/api/bills/transaction/${id}`).then(r => r.data);
export const updateVendor = (id, data) => api.patch(`/api/bills/vendor/${id}`, data).then(r => r.data);
export const getVendors = () => api.get('/api/bills/vendors').then(r => r.data);
export const lookupVendorActions = (id) => api.post(`/api/bills/vendor/${id}/lookup-actions`).then(r => r.data);

// Scan
export const triggerScan = () => api.post('/api/bills/scan').then(r => r.data);

// Chat
export const startChat = () => api.post('/api/chat/start').then(r => r.data);
export const sendChatMessage = (sessionId, message) => api.post('/api/chat/message', { sessionId, message }).then(r => r.data);
export const endChat = (sessionId) => api.post('/api/chat/end', { sessionId }).then(r => r.data);
export const getActiveChat = () => api.get('/api/chat/active').then(r => r.data);

// Push
export const getVapidKey = () => api.get('/api/push/vapid-key').then(r => r.data);
export const subscribePush = (data) => api.post('/api/push/subscribe', data).then(r => r.data);
export const unsubscribePush = (data) => api.delete('/api/push/unsubscribe', { data }).then(r => r.data);
export const testPush = () => api.post('/api/push/test').then(r => r.data);

// Settings
export const getSettings = () => api.get('/api/settings').then(r => r.data);
export const updateSettings = (data) => api.patch('/api/settings', data).then(r => r.data);
export const saveGmailCredentials = (data) => api.post('/api/settings/gmail', data).then(r => r.data);
