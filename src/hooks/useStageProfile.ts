import { useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { getStageProfile, type StageProfile } from '../engine/stageProfile';

export function useStageProfile(): StageProfile {
  const profile = useAuthStore((s) => s.profile);
  return useMemo(() => getStageProfile(profile), [profile]);
}
