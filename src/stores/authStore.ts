import { create } from 'zustand';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { deleteUserAppData, deleteUserAccount } from '../lib/accountReset';
import { getAuthErrorMessage } from '../lib/constants';
import type { Profile, ProfileUpdate } from '../types/database';

let profileFetchInFlight: string | null = null;

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
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
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
        setTimeout(() => {
          void import('../lib/prefetchCoreData').then(({ clearCoreDataCaches }) => {
            clearCoreDataCaches();
          });
        }, 0);
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
    set({ isLoading: true });
    try {
      const { logOutSubscriber } = await import('../lib/subscriptions');
      const { cancelAllReminders } = await import('../lib/localNotifications');
      await Promise.allSettled([logOutSubscriber(), cancelAllReminders()]);
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
      const { clearCoreDataCaches } = await import('../lib/prefetchCoreData');
      clearCoreDataCaches();
    }
  },

  resetPassword: async (email) => {
    set({ isLoading: true, error: null });
    const { getPasswordResetRedirectUrl } = await import('../lib/appUrl');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getPasswordResetRedirectUrl(),
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

        const { data: upserted, error: healError } = await supabase
          .from('profiles')
          .upsert({ id: userId, email, display_name: null })
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

  deleteAccount: async () => {
    const { user } = get();
    if (!user) return { success: false, error: 'Not authenticated' };

    set({ isLoading: true, error: null });
    const result = await deleteUserAccount();
    if (!result.success) {
      set({ isLoading: false, error: result.error ?? 'Deletion failed' });
      return result;
    }
    // Auth identity is gone and local session is cleared — wipe store state.
    set({ user: null, profile: null, isAuthenticated: false, isLoading: false });
    return { success: true };
  },

  resetAccount: async () => {
    const { user } = get();
    if (!user) return { success: false, error: 'Not authenticated' };

    set({ isLoading: true, error: null });
    const result = await deleteUserAppData();
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
