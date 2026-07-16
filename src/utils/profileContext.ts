import type { Profile } from '../types/database';

export function hasConfirmedProfileContext(profile: Profile | null | undefined): boolean {
  return Boolean(
    profile &&
      profile.has_uterus !== null &&
      profile.has_uterus_confirmed_at &&
      profile.timezone &&
      profile.timezone_confirmed_at,
  );
}
