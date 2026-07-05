import { createClient } from '@supabase/supabase-js';
import { IS_DEV_MODE } from './devMode';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!IS_DEV_MODE && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    'Missing Supabase environment variables. Copy .env.example to .env and fill in your project credentials, or set VITE_DEV_MODE=true for local testing.',
  );
}

// In dev mode, create a dummy client (unused — hooks use in-memory mock data)
export const supabase = createClient(
  IS_DEV_MODE ? 'https://placeholder.supabase.co' : supabaseUrl!,
  IS_DEV_MODE ? 'placeholder-anon-key' : supabaseAnonKey!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  },
);
