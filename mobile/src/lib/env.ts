import { Platform } from 'react-native';

const fallbackApiBaseUrl = 'https://api.studyrag.co/api';

export const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || fallbackApiBaseUrl,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || '',
  revenueCatApiKey:
    Platform.select({
      ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
      android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
      default: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    })?.trim() || '',
};

export function hasMobileEnvConfig() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}
