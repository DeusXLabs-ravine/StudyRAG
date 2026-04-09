import axios from 'axios';
import { env } from '@/lib/env';
import { supabase } from '@/lib/auth/supabase';

export const api = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async config => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    const message =
      error?.response?.data?.error?.message ||
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      'Something went wrong.';

    return Promise.reject(new Error(message));
  },
);
