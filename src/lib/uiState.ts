import { supabase } from './supabase';
import { useAuthStore } from '../stores/authStore';
import type { Profile } from '../types/database';

type UiState = Record<string, unknown>;

/**
 * Module-level mirror of profile.ui_state so non-React code
 * (insightReadState, used by the engine) can read synchronously.
 * Hydrated from the auth store; components should read reactively
 * from profile via hasUiFlag instead.
 */
let cachedState: UiState = {};

function hydrate(profile: Profile | null): void {
  cachedState = ((profile?.ui_state ?? {}) as UiState);
}

hydrate(useAuthStore.getState().profile);
useAuthStore.subscribe((s) => hydrate(s.profile));

/** Reactive read for components: pass the profile from the auth store. */
export function hasUiFlag(profile: Profile | null, key: string): boolean {
  return ((profile?.ui_state ?? {}) as UiState)[key] === true;
}

/** Synchronous read for non-React code. */
export function getUiValue<T>(key: string): T | undefined {
  return cachedState[key] as T | undefined;
}

/**
 * Optimistically updates the module cache, optionally mirrors into the auth
 * store (for reactive UI flags), then persists via the merge RPC.
 *
 * Pass `mirrorToProfile: false` for high-churn keys (e.g. viewed_insights) that
 * must not invalidate profile-dependent memos like useInsights on every write.
 */
export function setUiValue(
  key: string,
  value: unknown,
  opts?: { mirrorToProfile?: boolean },
): void {
  setUiValues({ [key]: value }, opts);
}

/** Persist multiple ui_state keys in one merge RPC. */
export function setUiValues(
  patch: Record<string, unknown>,
  opts?: { mirrorToProfile?: boolean },
): void {
  cachedState = { ...cachedState, ...patch };

  const mirrorToProfile = opts?.mirrorToProfile ?? true;
  if (mirrorToProfile) {
    const { profile } = useAuthStore.getState();
    if (profile) {
      useAuthStore.setState({
        profile: { ...profile, ui_state: { ...cachedState } },
      });
    }
  }

  void supabase.rpc('merge_ui_state', { p_patch: patch }).then(({ error }) => {
    if (error) console.error('Failed to persist ui_state patch:', error.message);
  });
}

export function setUiFlag(key: string): void {
  setUiValue(key, true);
}
