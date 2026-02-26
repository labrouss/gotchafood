import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// EXPO_PUBLIC_* vars are injected natively by Expo at bundle time.
// Do NOT use react-native-dotenv — it is incompatible with expo-router
// and causes the "Welcome to Expo" blank screen.
const resolvedApiUrl: string =
  (process.env.EXPO_PUBLIC_API_URL ?? '').startsWith('http')
    ? (process.env.EXPO_PUBLIC_API_URL as string)
    : '';

if (!resolvedApiUrl) {
  console.error(
    '❌ EXPO_PUBLIC_API_URL is not configured!\n' +
    '   Set it in docker-compose environment.\n' +
    '   Example: EXPO_PUBLIC_API_URL=http://192.168.1.100:3000'
  );
} else {
  console.log('🌐 API URL:', resolvedApiUrl);
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
        const parsed = JSON.parse(authStorage);
        const token = parsed?.state?.token;
        if (token) config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('❌ Error reading token:', e);
    }
    console.log('📡', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => { console.error('❌ Request error:', error); return Promise.reject(error); }
);

api.interceptors.response.use(
  (response) => { console.log('✅', response.status, response.config.url); return response; },
  (error) => {
    if (error.response) {
      console.error('❌ HTTP', error.response.status, error.config?.url, error.response.data?.message ?? '');
    } else if (error.request) {
      console.error('❌ No response — server unreachable:', error.config?.url);
    } else {
      console.error('❌ Axios error:', error.message);
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:      (email: string, password: string) => api.post('/auth/login', { email, password }),
  getProfile: () => api.get('/auth/me'),
};

// ── Menu ──────────────────────────────────────────────────────────────────────
export const menuAPI = {
  getAll:        () => api.get('/menu'),
  getCategories: () => api.get('/categories'),
};

// ── Waiter ────────────────────────────────────────────────────────────────────
export const waiterAPI = {
  getDashboard: () => api.get('/waiter/dashboard'),
  clockIn:      () => api.post('/waiter/clock-in'),
  clockOut:     () => api.post('/waiter/clock-out'),

  startSession: (data: {
    tableId: string; partySize: number;
    customerId?: string; loyaltyDiscount?: number; notes?: string;
  }) => api.post('/waiter/sessions', data),

  // POST (not PATCH) — backend: router.post('/sessions/:id/end', endTableSession)
  endSession: (sessionId: string, data?: { paymentMethod: string }) =>
    api.post(`/waiter/sessions/${sessionId}/end`, data),

  createOrder: (sessionId: string, items: any[], loyaltyPhone?: string) =>
    api.post(`/waiter/sessions/${sessionId}/orders`, { items, ...(loyaltyPhone ? { loyaltyPhone } : {}) }),

  // PATCH /waiter/sessions/:sessionId/orders/:orderId/served
  updateOrderStatus: (sessionId: string, orderId: string) =>
    api.patch(`/waiter/sessions/${sessionId}/orders/${orderId}/served`),

  // Phone lookup — route is GET /loyalty/lookup/:phone
  lookupLoyaltyCustomer: (phone: string) =>
    api.get(`/loyalty/lookup/${encodeURIComponent(phone)}`),

  // QR scan — POST /user/identify-loyalty  { token: string }
  // Decrypts the encrypted token from the customer's loyalty card QR code.
  // Returns user: { id, firstName, lastName, email, phone }
  identifyLoyalty: (token: string) =>
    api.post('/user/identify-loyalty', { token }),

  // Get app-user loyalty data (LoyaltyReward) by phone — used after QR scan
  // Returns user: { id, name, phone, points, discount, tier, lifetimePoints }
  lookupUserLoyalty: (phone: string) =>
    api.get(`/loyalty/user-lookup/${encodeURIComponent(phone)}`),
};

// ── Orders ────────────────────────────────────────────────────────────────────
export const orderAPI = {
  getById:    (id: string) => api.get(`/orders/${id}`),
  markServed: (id: string) => api.patch(`/orders/${id}/served`),
};

// ── Tables ────────────────────────────────────────────────────────────────────
export const tablesAPI = {
  getAll: () => api.get('/tables'),
};

export default api;
