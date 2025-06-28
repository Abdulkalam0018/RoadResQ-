import axios from 'axios';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;


// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // For cookies
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  register: (userData) => api.post('/users/register', userData),
  login: (credentials) => api.post('/users/login', credentials),
  logout: () => api.post('/users/logout'),
  getCurrentUser: () => api.get('/users/get-current-user'),
  changePassword: (passwordData) => api.post('/users/change-password', passwordData),
  forgotPassword: (emailData) => api.post('/users/forgot-password', emailData),
  resetPassword: (resetData) => api.post('/users/reset-password', { token: resetData.token, password: resetData.password }),
  verifyEmail: (tokenData) => api.post('/users/verify-email', tokenData),
};

// Mechanics API calls
export const mechanicsAPI = {
  getNearby: (lat, lon, radius = 5) => 
    api.get(`/mechanics/nearby?lat=${lat}&lon=${lon}&radius=${radius}`),
  updateAvailability: (isAvailable) => 
    api.patch('/mechanics/update-availability', { isAvailable }),
  addOrEditGarage: (garage) => 
    api.post('/users/add-or-update-garage', garage),
  rateGarage: (mechanicId, garageIndex, value) =>
    api.post(`/mechanics/rate/${mechanicId}`, { garageIndex, value }),
};

// User API calls
export const userAPI = {
  updateProfile: (userData) => api.patch('/users/update-account-details', userData),
  updateLocation: (location) => api.put('/users/update-location', { location }),
  deleteGarage: (index) => 
    api.post('/users/delete-garage', { index }),
  getUserGarages: (userId) => api.get(`/users/garages/${userId}`),
  addOrUpdateGarage: (garageData) => api.post('/users/add-or-update-garage', garageData),
};

// Chat API calls
export const chatAPI = {
  getChats: () => api.get('/chats'),
  getMessages: (chatId) => api.get(`/chats/${chatId}/messages`),
  sendMessage: (messageData) => api.post('/chats/message', messageData),
  createChat: (participantId) => api.post('/chats', { participantId }),
  markAsRead: (chatId) => api.post(`/chats/${chatId}/mark-read`),
  getOrCreateChat: (userId) => api.get(`/chats/user/${userId}`),
};

export default api;
