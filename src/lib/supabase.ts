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

/**
 * Sessions always persist, on web and on iOS alike.
 *
 * The login form used to carry a "Remember me" checkbox whose value was never read. It was
 * briefly wired to a sessionStorage-backed adapter, then removed: staying signed in is the
 * intended product behaviour, so offering the choice was the defect, not the missing wiring.
 * Signing out is the deliberate act, and Settings already provides it.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
