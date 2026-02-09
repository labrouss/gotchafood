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
