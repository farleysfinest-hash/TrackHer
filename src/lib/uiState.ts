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
 * Optimistically updates the store (instant UI response), then persists
 * via the merge RPC. Persistence failures are logged, not surfaced —
 * the worst case is a banner reappearing next session.
 */
export function setUiValue(key: string, value: unknown): void {
  cachedState = { ...cachedState, [key]: value };

  const { profile } = useAuthStore.getState();
  if (profile) {
    useAuthStore.setState({
      profile: { ...profile, ui_state: { ...cachedState } },
    });
  }

  void supabase
    .rpc('merge_ui_state', { p_patch: { [key]: value } })
    .then(({ error }) => {
      if (error) console.error(`Failed to persist ui_state.${key}:`, error.message);
    });
}

export function setUiFlag(key: string): void {
  setUiValue(key, true);
}
