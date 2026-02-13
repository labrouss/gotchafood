import axios from 'axios';

const API_URL = 'http://10.1.11.35:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    const { state } = JSON.parse(authStorage);
    if (state.token) {
      config.headers.Authorization = `Bearer ${state.token}`;
    }
  }
  return config;
});

// Auth APIs
export const authAPI = {
  register: async (data: any) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Menu APIs
export const menuAPI = {
  getAll: async () => {
    const response = await api.get('/menu');
    return response.data;
  },
  getPopular: async () => {
    const response = await api.get('/menu/popular');
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/menu/${id}`);
    return response.data;
  },
};

// Category APIs
export const categoryAPI = {
  getAll: async () => {
    const response = await api.get('/categories');
    return response.data;
  },
  getBySlug: async (slug: string) => {
    const response = await api.get(`/categories/${slug}`);
    return response.data;
  },
};

// Order APIs
export const orderAPI = {
  create: async (data: any) => {
    const response = await api.post('/orders', data);
    return response.data;
  },
  getAll: async () => {
    const response = await api.get('/orders');
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },
  cancel: async (id: string, reason?: string) => {
    const response = await api.post(`/orders/${id}/cancel`, { reason });
    return response.data;
  },
};

// Address APIs
export const addressAPI = {
  getAll: async () => {
    const response = await api.get('/user/addresses');
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/user/addresses', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.put(`/user/addresses/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/user/addresses/${id}`);
    return response.data;
  },
  setDefault: async (id: string) => {
    const response = await api.patch(`/user/addresses/${id}/default`);
    return response.data;
  },
};

// Admin APIs
export const adminAPI = {
  // Dashboard
  getDashboard: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  // Categories
  getCategories: async () => {
    const response = await api.get('/admin/categories');
    return response.data;
  },
  createCategory: async (data: any) => {
    const response = await api.post('/admin/categories', data);
    return response.data;
  },
  updateCategory: async (id: string, data: any) => {
    const response = await api.put(`/admin/categories/${id}`, data);
    return response.data;
  },
  deleteCategory: async (id: string) => {
    const response = await api.delete(`/admin/categories/${id}`);
    return response.data;
  },

  // Menu Items
  createMenuItem: async (data: any) => {
    const response = await api.post('/admin/menu', data);
    return response.data;
  },
  updateMenuItem: async (id: string, data: any) => {
    const response = await api.put(`/admin/menu/${id}`, data);
    return response.data;
  },
  deleteMenuItem: async (id: string) => {
    const response = await api.delete(`/admin/menu/${id}`);
    return response.data;
  },

  // Orders
  getOrders: async (status?: string) => {
    const response = await api.get('/admin/orders', {
      params: status ? { status } : {},
    });
    return response.data;
  },
  getOrderDetails: async (id: string) => {
    const response = await api.get(`/admin/orders/${id}`);
    return response.data;
  },
  updateOrderStatus: async (id: string, status: string, additionalTime?: number) => {
    const response = await api.patch(`/admin/orders/${id}/status`, {
      status,
      ...(additionalTime !== undefined && { additionalTime })
    });
    return response.data;
  },
  updateOrderItemStatus: async (id: string, status: 'started' | 'completed') => {
    const response = await api.patch(`/admin/order-items/${id}/status`, { status });
    return response.data;
  },
  cancelOrder: async (id: string, reason?: string) => {
    const response = await api.post(`/admin/orders/${id}/cancel`, { reason });
    return response.data;
  },

  // Customers
  getCustomers: async () => {
    const response = await api.get('/admin/customers');
    return response.data;
  },
  getCustomerDetails: async (id: string) => {
    const response = await api.get(`/admin/customers/${id}`);
    return response.data;
  },
  toggleCustomerStatus: async (id: string) => {
    const response = await api.patch(`/admin/customers/${id}/toggle-status`);
    return response.data;
  },
  updateUserRole: async (id: string, role: string) => {
    const response = await api.patch(`/admin/customers/${id}/role`, { role });
    return response.data;
  },
  updateUserRoutingRole: async (id: string, routingRole: string | null) => {
    const response = await api.patch(`/admin/customers/${id}/routing-role`, { routingRole });
    return response.data;
  },
  getStaffPerformance: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await api.get(`/admin/staff-performance?${params.toString()}`);
    return response.data;
  },
  getInsights: async (days: number = 7) => {
    const response = await api.get(`/analytics?days=${days}`);
    return response.data;
  },
};

// Analytics API
export const analyticsAPI = {
  getAnalytics: async (period: string = 'week') => {
    const response = await api.get(`/analytics?period=${period}`);
    return response.data;
  },
};

export default api;

// Review API
export const reviewAPI = {
  create: async (data: any) => {
    const response = await api.post('/reviews', data);
    return response.data;
  },
  getMyReviews: async () => {
    const response = await api.get('/reviews/my-reviews');
    return response.data;
  },
  getAll: async (status?: string, type?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (type) params.append('type', type);
    const response = await api.get(`/reviews/all?${params}`);
    return response.data;
  },
  updateStatus: async (id: string, status: string, adminResponse?: string) => {
    const response = await api.patch(`/reviews/${id}`, { status, adminResponse });
    return response.data;
  },
};

// Loyalty API
export const loyaltyAPI = {
  getMyLoyalty: async () => {
    const response = await api.get('/loyalty/my-loyalty');
    return response.data;
  },
};

// ── Staff HR API ───────────────────────────────────────────────────────────
export const staffhrAPI = {
  getAll: async () => {
    const r = await api.get('/staffhr');
    return r.data;
  },
  hire: async (data: any) => {
    const r = await api.post('/staffhr', data);
    return r.data;
  },
  update: async (id: string, data: any) => {
    const r = await api.patch(`/staffhr/${id}`, data);
    return r.data;
  },
  toggleLogin: async (id: string) => {
    const r = await api.patch(`/staffhr/${id}/toggle-login`);
    return r.data;
  },
  fire: async (id: string, reason: string) => {
    const r = await api.post(`/staffhr/${id}/fire`, { reason });
    return r.data;
  },
  rehire: async (id: string, role: string, routingRole?: string) => {
    const r = await api.post(`/staffhr/${id}/rehire`, { role, routingRole });
    return r.data;
  },
  resetPassword: async (id: string, password: string) => {
    const r = await api.post(`/staffhr/${id}/reset-password`, { password });
    return r.data;
  },
  saveSchedule: async (id: string, shifts: any[]) => {
    const r = await api.put(`/staffhr/${id}/schedule`, { shifts });
    return r.data;
  },
  getWeeklySchedule: async () => {
    const r = await api.get('/staffhr/schedule/weekly');
    return r.data;
  },
};

// ── Image Upload API ───────────────────────────────────────────────────────
export const imageAPI = {
  // Upload a single image, optionally with crop params → returns { url }
  uploadSingle: async (file: File, crop?: { x: number; y: number; w: number; h: number }) => {
    const fd = new FormData();
    fd.append('image', file);
    if (crop) {
      fd.append('cropX', String(crop.x));
      fd.append('cropY', String(crop.y));
      fd.append('cropW', String(crop.w));
      fd.append('cropH', String(crop.h));
    }
    const r = await api.post('/images/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return r.data;
  },

  // Product gallery
  getProductImages: async (productId: string) => {
    const r = await api.get(`/images/products/${productId}/images`);
    return r.data;
  },
  addProductImage: async (productId: string, file: File, crop?: { x: number; y: number; w: number; h: number }) => {
    const fd = new FormData();
    fd.append('image', file);
    if (crop) {
      fd.append('cropX', String(crop.x)); fd.append('cropY', String(crop.y));
      fd.append('cropW', String(crop.w)); fd.append('cropH', String(crop.h));
    }
    const r = await api.post(`/images/products/${productId}/images`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return r.data;
  },
  deleteProductImage: async (productId: string, imageId: string) => {
    const r = await api.delete(`/images/products/${productId}/images/${imageId}`);
    return r.data;
  },
  reorderProductImages: async (productId: string, orderedIds: string[]) => {
    const r = await api.put(`/images/products/${productId}/images/reorder`, { orderedIds });
    return r.data;
  },
  setPrimary: async (productId: string, imageId: string) => {
    const r = await api.patch(`/images/products/${productId}/images/${imageId}/primary`);
    return r.data;
  },
  getStockImages: async () => {
    const r = await api.get('/images/stock');
    return r.data;
  },
};

// ── Pack 5: Settings, Loyalty Tiers, Counter ─────────────────────────────
// ── Pack 5: Settings, Loyalty Tiers, Counter ─────────────────────────────
export const settingsAPI = {
  getAll: async () => {
    const response = await api.get('/settings');
    return response.data;
  },
  getOne: async (key: string) => {
    const response = await api.get(`/settings/${key}`);
    return response.data;
  },
  update: async (key: string, value: any) => {
    const response = await api.put(`/settings/${key}`, { value });
    return response.data;
  },
  bulkUpdate: async (settings: { key: string; value: any }[]) => {
    const response = await api.post('/settings/bulk', { settings });
    return response.data;
  },
  initialize: async () => {
    const response = await api.post('/settings/initialize');
    return response.data;
  },
};

export const loyaltyTiersAPI = {
  getAll: async () => {
    const response = await api.get('/loyalty-tiers');
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/loyalty-tiers', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.put(`/loyalty-tiers/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/loyalty-tiers/${id}`);
    return response.data;
  },
  initialize: async () => {
    const response = await api.post('/loyalty-tiers/initialize');
    return response.data;
  },
};

export const counterAPI = {
  getAll: async (status?: string, date?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (date) params.append('date', date);
    const response = await api.get(`/counter?${params}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/counter', data);
    return response.data;
  },
  updateStatus: async (id: string, status: string) => {
    const response = await api.put(`/counter/${id}/status`, { status });
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/counter/stats');
    return response.data;
  },
};

export const backupAPI = {
  create: async () => {
    const response = await api.post('/settings/backup');
    return response.data;
  },
  list: async () => {
    const response = await api.get('/settings/backup');
    return response.data;
  },
  download: async (filename: string) => {
    const response = await api.get(`/settings/backup/${filename}`, {
      responseType: 'blob',
    });
    return response.data;
  },
  restore: async (filename: string) => {
    const response = await api.post(`/settings/backup/${filename}/restore`);
    return response.data;
  },
};
