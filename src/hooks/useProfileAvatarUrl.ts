import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { getProfileAvatarStamp, getProfileAvatarUrl } from '../utils/profileAvatar';

/**
 * Resolves a short-lived signed URL for the user's profile picture.
 *
 * Returns null when there is no picture, which is the common case — the stamp
 * in ui_state means we can skip the network call entirely rather than probing
 * Storage for an object that isn't there. Re-resolves when the stamp changes,
 * so a fresh upload replaces a cached image immediately.
 */
export function useProfileAvatarUrl(): string | null {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const profile = useAuthStore((s) => s.profile);
  const stamp = getProfileAvatarStamp(profile);

  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !stamp) {
      setUrl(null);
      return;
    }

    let cancelled = false;
    void getProfileAvatarUrl(userId).then((next) => {
      if (!cancelled) setUrl(next);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, stamp]);

  return url;
}
