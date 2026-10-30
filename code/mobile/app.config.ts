import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: config.name || 'mobile',
    slug: config.slug || 'mobile',
    extra: {
      ...config.extra,
      // No localhost default here: a truthy value would shadow the LAN-IP /
      // Android-emulator fallbacks in src/api/client.ts getBaseUrl().
      apiUrl: process.env.API_URL ?? process.env.EXPO_PUBLIC_API_URL,
    },
  };
};
