import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL as ENV_API_URL } from '@env';

// API_URL resolution priority:
//  1. @env (react-native-dotenv reads .env at Metro bundle time)
//  2. EXPO_PUBLIC_API_URL (Expo's built-in env injection for Docker)
//  3. Hard-coded fallback so the app shows a useful error rather than crashing
const resolvedApiUrl: string =
  (typeof ENV_API_URL === 'string' && ENV_API_URL.startsWith('http') ? ENV_API_URL : '') ||
  (typeof (process.env as any).EXPO_PUBLIC_API_URL === 'string' ? (process.env as any).EXPO_PUBLIC_API_URL : '') ||
  '';

if (!resolvedApiUrl) {
  console.error(
    '❌ API_URL is not configured!\n' +
    '   Set API_URL in /mobile/.env or EXPO_PUBLIC_API_URL in docker-compose environment.\n' +
    '   Example: API_URL=http://192.168.1.100:3000'
  );
} else {
  console.log('🌐 API URL resolved to:', resolvedApiUrl);
}

const api = axios.create({
  baseURL: resolvedApiUrl ? `${resolvedApiUrl}/api` : '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

api.interceptors.request.use(
  async (config) => {
    try {
      const authStorage = await AsyncStorage.getItem('auth-storage');
      if (authStorage) {
        const parsedAuth = JSON.parse(authStorage);
        const token = parsedAuth?.state?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error('❌ Error reading token from storage:', error);
    }
    console.log('📡', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ Request setup error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log('✅', response.status, response.config.url);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('❌ HTTP', error.response.status, error.config?.url, error.response.data?.message ?? '');
    } else if (error.request) {
      console.error('❌ No response from server — is the backend reachable?', error.config?.url);
      console.error('   Check API_URL:', resolvedApiUrl || 'NOT SET');
    } else {
      console.error('❌ Axios error:', error.message);
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

  startSession: (data: {
    tableId: string;
    partySize: number;
    customerId?: string;
    loyaltyDiscount?: number;
    notes?: string;
  }) => api.post('/waiter/sessions', data),

  endSession: (sessionId: string, data?: { paymentMethod: string }) =>
    api.post(`/waiter/sessions/${sessionId}/end`, data),

  createOrder: (sessionId: string, items: any[]) =>
    api.post(`/waiter/sessions/${sessionId}/orders`, { items }),

  // Correct endpoint: PATCH /waiter/sessions/:sessionId/orders/:orderId/served
  updateOrderStatus: (sessionId: string, orderId: string) =>
    api.patch(`/waiter/sessions/${sessionId}/orders/${orderId}/served`),

  lookupLoyaltyCustomer: (phone: string) =>
    api.get(`/loyalty/lookup/${encodeURIComponent(phone)}`),
};

// ── Orders ───────────────────────────────────────────────────────────────────
export const orderAPI = {
  getById: (id: string) => api.get(`/orders/${id}`),
  markServed: (id: string) =>
    api.patch(`/orders/${id}/served`),
};

// ── Tables ───────────────────────────────────────────────────────────────────
export const tablesAPI = {
  getAll: () => api.get('/tables'),
};

export default api;
