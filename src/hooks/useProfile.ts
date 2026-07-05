import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import type { ProfileUpdate } from '../types/database';

export function useProfile() {
  const { profile, updateProfile, fetchProfile, user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(
    async (updates: ProfileUpdate) => {
      setIsUpdating(true);
      setError(null);
      const result = await updateProfile(updates);
      setIsUpdating(false);
      if (!result.success) {
        setError(result.error ?? 'Failed to update profile');
      }
      return result;
    },
    [updateProfile],
  );

  const refresh = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  return {
    profile,
    isUpdating,
    error,
    update,
    refresh,
  };
}
