import Constants from 'expo-constants';

// Read from dynamic Expo config (extra.apiUrl) or EXPO_PUBLIC_API_URL or default to emulator/localhost
const apiUrl =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://10.0.2.2:3000';

export default {
  apiUrl,
};
