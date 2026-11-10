import axios from 'axios';

let rawBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
if (rawBaseUrl.endsWith('/')) {
  rawBaseUrl = rawBaseUrl.slice(0, -1);
}
const API_BASE_URL = rawBaseUrl || (typeof window !== 'undefined' && window.location.port === '5173' ? '' : 'http://localhost:3000');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Accept': 'application/json',
  },
  timeout: 300000, // 5 minutes for large uploads
  withCredentials: true,
});

// Request interceptor to add JWT token and set Content-Type appropriately
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  // Let the browser set the boundary header for FormData automatically
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  } else if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.response?.data?.error_code !== 'GOOGLE_RECONNECT_REQUIRED') {
      // Unauthorized - remove invalid token and user and notify app
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-change'));
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
