import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

export const TOKEN_KEY = 'smartmess_token';

const baseURL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://10.0.2.2:3000';

const apiClient = axios.create({ baseURL, timeout: 10000 });

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let _logoutCallback: (() => void) | null = null;

export const setLogoutCallback = (cb: () => void) => {
  _logoutCallback = cb;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      _logoutCallback?.();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
