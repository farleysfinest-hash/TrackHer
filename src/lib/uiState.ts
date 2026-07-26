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

/** Whose ui_state `cachedState` currently holds. Null before first hydrate and after sign-out. */
let cachedProfileId: string | null = null;

/**
 * Merge for the same user; replace on any user change.
 *
 * High-churn keys are written with `mirrorToProfile: false`, so between the optimistic cache
 * write and the `merge_ui_state` RPC landing, the new value exists *only* here. A wholesale
 * assignment on any intervening `fetchProfile` dropped it — which made `viewed_insights`
 * unreliable, so safeguarding and bleeding cards could reappear as unread.
 *
 * Merging unconditionally would be worse than the bug: on sign-out the profile goes null, and
 * the next user would inherit the previous user's flags. So the merge is scoped to one identity
 * and anything else resets the cache outright.
 */
function hydrate(profile: Profile | null): void {
  const incoming = (profile?.ui_state ?? {}) as UiState;
  const incomingId = profile?.id ?? null;

  if (incomingId === null || incomingId !== cachedProfileId) {
    cachedProfileId = incomingId;
    cachedState = incoming;
    return;
  }

  // Same user: server keys win on conflict, local-only keys (an in-flight optimistic write)
  // have no server counterpart and survive.
  cachedState = { ...cachedState, ...incoming };
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

  // A transport failure rejects rather than resolving with `error`, so this needs a catch as
  // well as the error check — a bare `.then` would surface it as an unhandled rejection.
  // (The builder is only PromiseLike, so `.catch` is not available on it directly.)
  void (async () => {
    try {
      const { error } = await supabase.rpc('merge_ui_state', { p_patch: patch });
      if (error) console.error('Failed to persist ui_state patch:', error.message);
    } catch (e) {
      console.error('Failed to persist ui_state patch:', e instanceof Error ? e.message : e);
    }
  })();
}

export function setUiFlag(key: string): void {
  setUiValue(key, true);
}
