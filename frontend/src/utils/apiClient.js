import axios from 'axios';

// Extract raw base URL from Vite environment variable
const rawEnvUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

/**
 * Returns the formatted API base URL.
 * e.g., 'https://backend.com/api' or '/api'
 */
export const getApiBaseUrl = () => {
  if (!rawEnvUrl) return '/api';
  if (rawEnvUrl.endsWith('/api')) return rawEnvUrl;
  return `${rawEnvUrl}/api`;
};

/**
 * Returns full URL for uploaded media files.
 * e.g., 'https://backend.com/uploads/photo.jpg' or '/uploads/photo.jpg'
 */
export const getUploadUrl = (path) => {
  if (!path) return '';
  if (typeof path !== 'string') return path;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (rawEnvUrl) {
    const domainBase = rawEnvUrl.replace(/\/api$/, '');
    return `${domainBase}${cleanPath}`;
  }
  return cleanPath;
};

/**
 * Returns socket connection URL for Socket.io client.
 */
export const getSocketUrl = () => {
  if (rawEnvUrl) {
    return rawEnvUrl.replace(/\/api$/, '');
  }
  return window.location.origin;
};

// Create Axios Instance with dynamic Base URL
const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
});

// Request Interceptor: Auto-attach Authorization Token
apiClient.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem('token');

    // Fallback check in stored userInfo object
    if (!token) {
      const userInfoStr = localStorage.getItem('userInfo');
      if (userInfoStr) {
        try {
          const parsed = JSON.parse(userInfoStr);
          if (parsed?.token) {
            token = parsed.token;
          }
        } catch (e) {
          // ignore parse errors
        }
      }
    }

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle API errors gracefully
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Return structured error message if available
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected network error occurred';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
