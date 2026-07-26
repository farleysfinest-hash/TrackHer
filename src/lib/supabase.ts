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
 * Session persistence, switchable at sign-in time.
 *
 * The login form has always had a "Remember me" checkbox whose value was never read — the
 * session persisted either way. Rather than delete the control, this backs it: unchecked stores
 * the auth token in sessionStorage, so it dies with the tab; checked keeps localStorage.
 *
 * The *choice* itself always lives in localStorage, because on the next cold start we have to
 * know which store to read the token from before any session exists to tell us.
 */
const PERSISTENCE_KEY = 'trackher.auth.persistence';
type PersistenceMode = 'local' | 'session';

function readPersistenceMode(): PersistenceMode {
  try {
    return window.localStorage.getItem(PERSISTENCE_KEY) === 'session' ? 'session' : 'local';
  } catch {
    // Private mode / storage disabled — fall back to the default rather than blocking boot.
    return 'local';
  }
}

let persistenceMode: PersistenceMode = readPersistenceMode();

function activeStore(): Storage {
  return persistenceMode === 'session' ? window.sessionStorage : window.localStorage;
}

/** Supabase namespaces its auth token as `sb-<project-ref>-auth-token`. */
function purgeAuthKeys(store: Storage): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key?.startsWith('sb-')) keys.push(key);
    }
    for (const key of keys) store.removeItem(key);
  } catch {
    // Nothing recoverable, and never worth failing a sign-in over.
  }
}

/**
 * Must be called *before* signing in, so the token is written to the intended store and no
 * migration of an existing token is needed.
 */
export function setSessionPersistence(remember: boolean): void {
  const next: PersistenceMode = remember ? 'local' : 'session';
  persistenceMode = next;
  try {
    window.localStorage.setItem(PERSISTENCE_KEY, next);
  } catch {
    // Preference is best-effort; the in-memory mode still governs this session.
  }
  // Drop any token left in the store we are no longer using, so a stale one cannot be picked up
  // on the next load and silently resurrect a session the user asked not to keep.
  purgeAuthKeys(next === 'session' ? window.localStorage : window.sessionStorage);
}

const switchableStorage = {
  getItem: (key: string): string | null => {
    try {
      return activeStore().getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      activeStore().setItem(key, value);
    } catch {
      // Storage full or unavailable; the session stays in memory for this tab.
    }
  },
  removeItem: (key: string): void => {
    try {
      activeStore().removeItem(key);
    } catch {
      // Nothing to do.
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: switchableStorage,
  },
});
