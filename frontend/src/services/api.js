import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Tạo axios instance với config mặc định
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor để thêm token vào header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor để xử lý response
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
};

// Dishes API
export const dishesAPI = {
  getDishes: (params = {}) => api.get('/dishes', { params }),
  getDish: (id) => api.get(`/dishes/${id}`),
  getDishStats: (id) => api.get(`/dishes/${id}/stats`),
  getCategories: () => api.get('/dishes/categories'), // API chỉ trả về categories đang hoạt động
  getReviews: (id, params = {}) => api.get(`/dishes/${id}/reviews`, { params }),
  createReview: (id, data) => api.post(`/dishes/${id}/reviews`, data),
};

// Orders API
export const ordersAPI = {
  createOrder: (orderData) => api.post('/orders', orderData),
  getMyOrders: (params = {}) => api.get('/orders/my-orders', { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
};

// Recommendations API
export const recommendationsAPI = {
  getPersonal: (params = {}) => api.get('/recommendations/personal', { params }),
  getTimeBased: (params = {}) => api.get('/recommendations/time-based', { params }),
  getWeatherBased: (params = {}) => api.get('/recommendations/weather-based', { params }),
  getSmart: (params = {}) => api.get('/recommendations/smart', { params }),
  sendFeedback: (data) => api.post('/recommendations/feedback', data),
};

// Chatbot API
export const chatbotAPI = {
  sendMessage: (data) => api.post('/chatbot/message', data),
  getHistory: (params = {}) => api.get('/chatbot/history', { params }),
};

export const vouchersAPI = {
  getPublic: () => api.get('/vouchers/public'),
  useVoucher: (code) => api.post('/vouchers/use', { code }),
};

export default api;
