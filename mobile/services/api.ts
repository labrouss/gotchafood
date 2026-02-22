import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';

console.log('🌐 API URL:', API_URL || 'NOT SET');

const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
});

// ✅ FIX: Attach JWT to every request - read from AsyncStorage
api.interceptors.request.use(
  async (config) => {
    try {
      // Read the persisted auth state from AsyncStorage
      const authStorage = await AsyncStorage.getItem('auth-storage');
      
      if (authStorage) {
        const parsedAuth = JSON.parse(authStorage);
        const token = parsedAuth?.state?.token;
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('✅ Token attached to request:', token.substring(0, 20) + '...');
        } else {
          console.warn('⚠️ No token found in auth storage');
        }
      } else {
        console.warn('⚠️ No auth storage found');
      }
    } catch (error) {
      console.error('❌ Error reading token from storage:', error);
    }
    
    console.log('📡 Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Log responses and errors
api.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', response.config.url, response.status);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('❌ Response error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('❌ Network error - no response received');
      console.error('Request:', error.config?.url);
    } else {
      console.error('❌ Error:', error.message);
    }
    return Promise.reject(error);
  }
);

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
        api.post('/waiter/sessions/start', data),
    endSession: (id: string) => api.post(`/waiter/sessions/${id}/end`),
    createOrder: (sessionId: string, items: any[]) =>
        api.post(`/waiter/sessions/${sessionId}/orders`, { items }),
};

// ── Orders ───────────────────────────────────────────────────────────────────
export const orderAPI = {
    getById: (id: string) => api.get(`/orders/${id}`),
    markServed: (id: string) =>
        api.patch(`/orders/${id}/status`, { status: 'SERVED' }),
};

// ── Tables ───────────────────────────────────────────────────────────────────
export const tablesAPI = {
    getAll: () => api.get('/admin/tables'),
};

export default api;
