import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const {
    user,
    profile,
    isLoading,
    isInitialized,
    isAuthenticated,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    fetchProfile,
    clearError,
  } = useAuthStore();

  useEffect(() => {
    const cleanup = useAuthStore.getState().initialize();
    return cleanup;
  }, []);

  return {
    user,
    profile,
    isLoading,
    isInitialized,
    isAuthenticated,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    fetchProfile,
    clearError,
  };
}
