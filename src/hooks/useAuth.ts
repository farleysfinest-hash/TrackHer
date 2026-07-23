import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const {
    user,
    profile,
    isLoading,
    isInitialized,
    isAuthenticated,
    error,
    profileLoadFailed,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    resetAccount,
    deleteAccount,
    fetchProfile,
    retryProfileLoad,
    clearError,
  } = useAuthStore();

  return {
    user,
    profile,
    isLoading,
    isInitialized,
    isAuthenticated,
    error,
    profileLoadFailed,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    resetAccount,
    deleteAccount,
    fetchProfile,
    retryProfileLoad,
    clearError,
  };
}
