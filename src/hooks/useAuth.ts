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
    resetAccount,
    fetchProfile,
    clearError,
  } = useAuthStore();

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
    resetAccount,
    fetchProfile,
    clearError,
  };
}
