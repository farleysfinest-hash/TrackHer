import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Copy .env.example to .env and fill in your project credentials.',
  );
}

if (supabaseUrl.includes('your-project') || supabaseAnonKey.includes('your-anon-key')) {
  throw new Error(
    'Supabase credentials are still the placeholders from .env.example. ' +
      'Put your real project URL and publishable key in .env, then rebuild ' +
      '(npm run build) and, for iOS, re-sync (npx cap sync ios).',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
