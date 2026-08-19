import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const TOKEN_KEY = 'smartmess_web_token';

const apiClient = axios.create({ baseURL: BASE_URL, timeout: 10000 });

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let _onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => { _onUnauthorized = fn; };

apiClient.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      _onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
