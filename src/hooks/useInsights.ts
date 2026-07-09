import { useCallback, useEffect, useMemo, useState } from 'react';
import { runPatternEngine } from '../engine/patternEngine';
import type { Insight } from '../engine/types';
import { useCheckins } from './useCheckins';
import { useMedications } from './useMedications';
import { useMedicationChanges } from './useMedicationChanges';
import { useLabResults } from './useLabResults';
import { useAuthStore } from '../stores/authStore';
import { IS_DEV_MODE } from '../lib/devMode';
import {
  getDevExtendedSymptomLogs,
  getDevDismissedInsights,
  addDevDismissedInsight,
} from '../lib/devStore';
import { supabase } from '../lib/supabase';
import type { ExtendedSymptomLog } from '../types/database';
import { filterDismissedInsights } from '../utils/insightHelpers';

const EXTENDED_LOGS_DAYS = 120;
const EXTENDED_LOGS_LIMIT = 500;

export function useInsights() {
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.user?.id);
  const { checkins, fetchCheckins, isLoading: checkinsLoading } = useCheckins();
  const { medications, fetchMedications, isLoading: medsLoading } = useMedications();
  const { changes, fetchChanges, isLoading: changesLoading } = useMedicationChanges();
  const { labResults, fetchLabResults, isLoading: labsLoading } = useLabResults();
  const [extendedSymptoms, setExtendedSymptoms] = useState<ExtendedSymptomLog[]>([]);
  const [extendedLoading, setExtendedLoading] = useState(!IS_DEV_MODE);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() =>
    IS_DEV_MODE ? new Set(getDevDismissedInsights()) : new Set(),
  );
  const [dismissalsLoading, setDismissalsLoading] = useState(!IS_DEV_MODE);

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

    if (!userId) {
      setExtendedSymptoms([]);
      setExtendedLoading(false);
      return;
    }

    let cancelled = false;
    setExtendedLoading(true);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - EXTENDED_LOGS_DAYS);
    const cutoffISO = cutoff.toISOString();

    void supabase
      .from('extended_symptom_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', cutoffISO)
      .order('created_at', { ascending: false })
      .limit(EXTENDED_LOGS_LIMIT)
      .then(({ data }) => {
        if (cancelled) return;
        setExtendedSymptoms((data as ExtendedSymptomLog[]) ?? []);
        setExtendedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (IS_DEV_MODE) {
      setDismissedIds(new Set(getDevDismissedInsights()));
      setDismissalsLoading(false);
      return;
    }

    if (!userId) {
      setDismissedIds(new Set());
      setDismissalsLoading(false);
      return;
    }

    let cancelled = false;
    setDismissalsLoading(true);

    void supabase
      .from('dismissed_insights')
      .select('insight_id')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (cancelled) return;
        const ids = (data as { insight_id: string }[] | null)?.map((row) => row.insight_id) ?? [];
        setDismissedIds(new Set(ids));
        setDismissalsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const medicationChanges = useMemo(
    () => changes.map(({ medication: _medication, ...change }) => change),
    [changes],
  );

  const engineInsights = useMemo(() => {
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

  const insights = useMemo(
    () => filterDismissedInsights(engineInsights, dismissedIds),
    [engineInsights, dismissedIds],
  );

  const dismissInsight = useCallback(
    async (insightId: string) => {
      setDismissedIds((prev) => new Set([...prev, insightId]));

      if (IS_DEV_MODE) {
        addDevDismissedInsight(insightId);
        return;
      }

      if (!userId) return;

      const { error } = await supabase.from('dismissed_insights').upsert(
        { user_id: userId, insight_id: insightId },
        { onConflict: 'user_id,insight_id' },
      );

      if (error) {
        console.error('Failed to dismiss insight:', error.message);
        setDismissedIds((prev) => {
          const next = new Set(prev);
          next.delete(insightId);
          return next;
        });
      }
    },
    [userId],
  );

  const highPriority = useMemo(
    () => insights.filter((i) => i.priority === 'high' || i.priority === 'medium'),
    [insights],
  );

  const positive = useMemo(
    () => insights.filter((i) => i.priority === 'positive'),
    [insights],
  );

  const isLoading =
    checkinsLoading ||
    medsLoading ||
    changesLoading ||
    labsLoading ||
    extendedLoading ||
    dismissalsLoading;

  return { insights, highPriority, positive, isLoading, dismissInsight, extendedSymptoms };
}

export type { Insight };
