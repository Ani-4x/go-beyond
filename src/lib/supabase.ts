import { createClient } from '@supabase/supabase-js';
import { largeSecureStore } from './secureStorage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env, fill in your Supabase project values, and restart `expo start`.',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: largeSecureStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** Database row shapes, matching supabase/migrations/0001_init.sql. */
export type ProfileRow = {
  id: string;
  zone: number[];
  xp: number;
  streak: number;
  last_completed: string | null;
  today: unknown;
  onboarded: boolean;
};

export type EntryRow = {
  id: string;
  user_id: string;
  type: 'challenge' | 'moment';
  title: string;
  tag: string;
  feel: string | null;
  created_at: string;
};
