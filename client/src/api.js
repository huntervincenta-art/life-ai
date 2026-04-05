import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export const getPantryItems = () => api.get('/api/pantry');
export const addPantryItem = (item) => api.post('/api/pantry', item);
export const updatePantryItem = (id, data) => api.patch(`/api/pantry/${id}`, data);
export const deletePantryItem = (id) => api.delete(`/api/pantry/${id}`);
export const analyzeRecipes = (items) => api.post('/api/pantry/analyze', { items });

export const parseEmail = (emailText) => api.post('/api/email/parse', { emailText });
export const getOrders = () => api.get('/api/email/orders');
export const getWalmartOrders = () => api.get('/api/walmart-orders');
