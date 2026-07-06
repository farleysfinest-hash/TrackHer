import { useEffect, useMemo, useState } from 'react';
import { runPatternEngine } from '../engine/patternEngine';
import type { Insight } from '../engine/types';
import { useCheckins } from './useCheckins';
import { useMedications } from './useMedications';
import { useMedicationChanges } from './useMedicationChanges';
import { useLabResults } from './useLabResults';
import { useAuthStore } from '../stores/authStore';
import { IS_DEV_MODE } from '../lib/devMode';
import { getDevExtendedSymptomLogs } from '../lib/devStore';
import { supabase } from '../lib/supabase';
import type { ExtendedSymptomLog } from '../types/database';

export function useInsights() {
  const profile = useAuthStore((s) => s.profile);
  const { checkins, fetchCheckins, isLoading: checkinsLoading } = useCheckins();
  const { medications, fetchMedications, isLoading: medsLoading } = useMedications();
  const { changes, fetchChanges, isLoading: changesLoading } = useMedicationChanges();
  const { labResults, fetchLabResults, isLoading: labsLoading } = useLabResults();
  const [extendedSymptoms, setExtendedSymptoms] = useState<ExtendedSymptomLog[]>([]);
  const [extendedLoading, setExtendedLoading] = useState(!IS_DEV_MODE);

  useEffect(() => {
    void fetchCheckins(100);
    void fetchMedications();
    void fetchChanges();
    void fetchLabResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (IS_DEV_MODE) {
      setExtendedSymptoms(getDevExtendedSymptomLogs());
      setExtendedLoading(false);
      return;
    }

    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      setExtendedSymptoms([]);
      setExtendedLoading(false);
      return;
    }

    let cancelled = false;
    setExtendedLoading(true);

    void supabase
      .from('extended_symptom_logs')
      .select('*')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (cancelled) return;
        setExtendedSymptoms((data as ExtendedSymptomLog[]) ?? []);
        setExtendedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [checkins.length]);

  const medicationChanges = useMemo(
    () => changes.map(({ medication: _medication, ...change }) => change),
    [changes],
  );

  const insights = useMemo(() => {
    if (!profile || checkins.length === 0) return [];

    return runPatternEngine({
      checkins,
      extendedSymptoms,
      medications,
      medicationChanges,
      labResults,
      profile,
    });
  }, [checkins, extendedSymptoms, medications, medicationChanges, labResults, profile]);

  const highPriority = useMemo(
    () => insights.filter((i) => i.priority === 'high' || i.priority === 'medium'),
    [insights],
  );

  const positive = useMemo(
    () => insights.filter((i) => i.priority === 'positive'),
    [insights],
  );

  const isLoading =
    checkinsLoading || medsLoading || changesLoading || labsLoading || extendedLoading;

  return { insights, highPriority, positive, isLoading };
}

export type { Insight };
