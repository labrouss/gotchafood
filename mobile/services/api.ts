import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Reads from .env via expo-constants, falls back to hardcoded host
const API_URL = process.env.API_URL || 'http://dockerhost.hpehellas-demo.com:3000';

const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
});

// Attach JWT to every request
api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('waiter_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),
    getProfile: () => api.get('/auth/me'),
};

// ── Menu ─────────────────────────────────────────────────────────────────────
export const menuAPI = {
    getAll: () => api.get('/menu'),
    getCategories: () => api.get('/categories'),
};

// ── Waiter ───────────────────────────────────────────────────────────────────
export const waiterAPI = {
    getDashboard: () => api.get('/waiter/dashboard'),
    clockIn: () => api.post('/waiter/clock-in'),
    clockOut: () => api.post('/waiter/clock-out'),
    startSession: (data: { tableId: string; partySize: number }) =>
        api.post('/waiter/sessions', data),
    endSession: (id: string) => api.post(`/waiter/sessions/${id}/end`),
    createOrder: (sessionId: string, items: any[]) =>
        api.post('/waiter/orders', { sessionId, items }),
};

// ── Orders ───────────────────────────────────────────────────────────────────
export const orderAPI = {
    getById: (id: string) => api.get(`/orders/${id}`),
    markServed: (id: string) =>
        api.patch(`/admin/orders/${id}/status`, { status: 'SERVED' }),
};

// ── Tables ───────────────────────────────────────────────────────────────────
export const tablesAPI = {
    getAll: () => api.get('/tables'),
};

export default api;
