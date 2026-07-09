import { create } from 'zustand';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { IS_DEV_MODE } from '../lib/devMode';
import { MOCK_USER, MOCK_PROFILE } from '../lib/mockData';
import { resetDevStore, resetDevDismissedInsights } from '../lib/devStore';
import {
  clearTrackHerLocalStorage,
  deleteUserAppData,
  PROFILE_RESET_FIELDS,
} from '../lib/accountReset';
import { getAuthErrorMessage } from '../lib/constants';
import type { Profile, ProfileUpdate } from '../types/database';

const DEV_ONBOARDING_KEY = 'dev_onboarding_completed';
let profileFetchInFlight: string | null = null;

function getDevOnboardingCompleted(): boolean {
  const stored = localStorage.getItem(DEV_ONBOARDING_KEY);
  if (stored !== null) return stored === 'true';
  return MOCK_PROFILE.onboarding_completed;
}

function getDevAuthState() {
  return {
    user: MOCK_USER as unknown as User,
    profile: { ...MOCK_PROFILE, onboarding_completed: getDevOnboardingCompleted() },
    isLoading: false,
    isInitialized: true,
    isAuthenticated: true,
    error: null,
  };
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  isAuthenticated: boolean;
  error: string | null;
  initialize: () => () => void;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: ProfileUpdate) => Promise<{ success: boolean; error?: string }>;
  resetAccount: () => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isInitialized: false,
  isAuthenticated: false,
  error: null,

  initialize: () => {
    if (IS_DEV_MODE) {
      set(getDevAuthState());
      return () => {};
    }

    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      // NOTE: Supabase-js holds an internal auth lock while dispatching this callback.
      // Keep it synchronous; defer any Supabase work with setTimeout(..., 0).
      if (!mounted) return;

      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session?.user) {
        set({ user: session.user, isAuthenticated: true, isLoading: false, isInitialized: true });
        const userId = session.user.id;
        setTimeout(() => {
          if (mounted) void get().fetchProfile(userId);
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, profile: null, isAuthenticated: false, isLoading: false });
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        set({ user: session.user, isAuthenticated: true });
      } else if (event === 'PASSWORD_RECOVERY') {
        set({ user: session?.user ?? null, isAuthenticated: !!session?.user });
      } else if (event === 'INITIAL_SESSION' && !session) {
        set({ user: null, profile: null, isAuthenticated: false, isLoading: false, isInitialized: true });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  },

  signUp: async (email, password, displayName) => {
    if (IS_DEV_MODE) {
      localStorage.setItem(DEV_ONBOARDING_KEY, 'false');
      set({
        ...getDevAuthState(),
        profile: {
          ...MOCK_PROFILE,
          onboarding_completed: false,
          display_name: displayName,
          email,
        },
      });
      console.log('[DEV] Sign up:', { email, displayName });
      return { success: true };
    }

    set({ isLoading: true, error: null });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    });
    set({ isLoading: false });
    if (error) {
      const message = getAuthErrorMessage(error);
      set({ error: message });
      return { success: false, error: message };
    }
    return { success: true };
  },

  signIn: async (email, password) => {
    if (IS_DEV_MODE) {
      set(getDevAuthState());
      console.log('[DEV] Sign in:', email);
      return { success: true };
    }

    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    set({ isLoading: false });
    if (error) {
      const message = getAuthErrorMessage(error);
      set({ error: message });
      return { success: false, error: message };
    }
    if (data.user) {
      set({ user: data.user, isAuthenticated: true });
      await get().fetchProfile(data.user.id);
    }
    return { success: true };
  },

  signOut: async () => {
    if (IS_DEV_MODE) {
      localStorage.removeItem(DEV_ONBOARDING_KEY);
      resetDevStore();
      set({
        user: null,
        profile: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
      });
      console.log('[DEV] Signed out');
      return;
    }

    set({ isLoading: true });
    try {
      await Promise.race([
        supabase.auth.signOut({ scope: 'local' }),
        new Promise((resolve) => setTimeout(resolve, 3500)),
      ]);
    } catch (e) {
      console.error('signOut error (state cleared anyway):', e);
    } finally {
      // Always clear local auth state, even if network/signOut fails.
      set({
        user: null,
        profile: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  resetPassword: async (email) => {
    if (IS_DEV_MODE) {
      console.log('[DEV] Password reset requested for:', email);
      return { success: true };
    }

    set({ isLoading: true, error: null });
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    set({ isLoading: false });
    if (error) {
      const message = getAuthErrorMessage(error);
      set({ error: message });
      return { success: false, error: message };
    }
    return { success: true };
  },

  updatePassword: async (password) => {
    if (IS_DEV_MODE) {
      console.log('[DEV] Password updated');
      return { success: true };
    }

    set({ isLoading: true, error: null });
    const { error } = await supabase.auth.updateUser({ password });
    set({ isLoading: false });
    if (error) {
      const message = getAuthErrorMessage(error);
      set({ error: message });
      return { success: false, error: message };
    }
    return { success: true };
  },

  fetchProfile: async (userId) => {
    if (IS_DEV_MODE) {
      set({ profile: { ...MOCK_PROFILE, onboarding_completed: getDevOnboardingCompleted() } });
      return;
    }

    if (profileFetchInFlight === userId) return;
    profileFetchInFlight = userId;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch profile:', error.message);
        return;
      }

      if (!data) {
        const user = get().user;
        const email = user?.email ?? '';
        const displayName = (email || 'there').split('@')[0];

        const { data: upserted, error: healError } = await supabase
          .from('profiles')
          .upsert({ id: userId, email, display_name: displayName })
          .select()
          .maybeSingle();

        if (healError) {
          console.error('Failed to recreate missing profile:', healError.message);
          return;
        }
        console.warn('Missing profile row recreated for user:', userId);
        set({ profile: upserted as Profile });
        return;
      }

      set({ profile: data as Profile });
    } finally {
      if (profileFetchInFlight === userId) profileFetchInFlight = null;
    }
  },

  updateProfile: async (updates: ProfileUpdate) => {
    if (IS_DEV_MODE) {
      const current = get().profile ?? MOCK_PROFILE;
      const updated: Profile = {
        ...current,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      if (updates.onboarding_completed) {
        localStorage.setItem(DEV_ONBOARDING_KEY, 'true');
      }
      set({ profile: updated });
      console.log('[DEV] Profile updated:', updates);
      return { success: true };
    }

    const { user } = get();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }
    if (!data && !error) {
      const { data: upsertData, error: upsertError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...updates })
        .select()
        .maybeSingle();
      if (upsertError) {
        return { success: false, error: upsertError.message };
      }
      set({ profile: upsertData as Profile });
      return { success: true };
    }
    set({ profile: data as Profile });
    return { success: true };
  },

  resetAccount: async () => {
    if (IS_DEV_MODE) {
      resetDevStore();
      resetDevDismissedInsights();
      localStorage.setItem(DEV_ONBOARDING_KEY, 'false');
      clearTrackHerLocalStorage();
      const current = get().profile ?? MOCK_PROFILE;
      set({
        profile: {
          ...current,
          ...PROFILE_RESET_FIELDS,
          updated_at: new Date().toISOString(),
        } as Profile,
      });
      console.log('[DEV] Account reset');
      return { success: true };
    }

    const { user } = get();
    if (!user) return { success: false, error: 'Not authenticated' };

    set({ isLoading: true, error: null });
    const result = await deleteUserAppData(user.id);
    if (!result.success) {
      set({ isLoading: false, error: result.error ?? 'Reset failed' });
      return result;
    }
    await get().fetchProfile(user.id);
    set({ isLoading: false });
    return { success: true };
  },

  clearError: () => set({ error: null }),
}));
