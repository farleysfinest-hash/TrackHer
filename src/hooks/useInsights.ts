import { useCallback, useEffect, useMemo, useState } from 'react';
import { runPatternEngine } from '../engine/patternEngine';
import type { Insight } from '../engine/types';
import { useCheckins } from './useCheckins';
import { useMedications } from './useMedications';
import { useMedicationChanges } from './useMedicationChanges';
import { useLabResults } from './useLabResults';
import { useAuthStore } from '../stores/authStore';
import { getResolvedTimezone } from '../utils/checkinHelpers';
import { supabase } from '../lib/supabase';
import type {
  ExtendedSymptomLog,
  MedicationAdministration,
  SymptomCheckin,
} from '../types/database';
import type { DismissalRecord } from '../utils/insightHelpers';
import { filterDismissedInsights } from '../utils/insightHelpers';

const EXTENDED_LOGS_DAYS = 120;
const EXTENDED_LOGS_LIMIT = 500;
const ADMINISTRATIONS_DAYS = 90;
/** Daily pulse can crowd out weekly MRS in a mixed limit — keep a dedicated MRS lane. */
const MIXED_CHECKIN_FETCH_LIMIT = 400;
const MRS_CHECKIN_FETCH_LIMIT = 120;

export function useInsights() {
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.user?.id);
  const timezone = getResolvedTimezone(profile?.timezone);
  const { checkins, fetchCheckins, isLoading: checkinsLoading } = useCheckins();
  const { medications, fetchMedications, isLoading: medsLoading } = useMedications();
  const { changes, fetchChanges, isLoading: changesLoading } = useMedicationChanges();
  const { labResults, fetchLabResults, isLoading: labsLoading } = useLabResults();
  const [mrsCheckins, setMrsCheckins] = useState<SymptomCheckin[]>([]);
  const [mrsLoading, setMrsLoading] = useState(true);
  const [extendedSymptoms, setExtendedSymptoms] = useState<ExtendedSymptomLog[]>([]);
  const [administrations, setAdministrations] = useState<MedicationAdministration[]>([]);
  const [extendedLoading, setExtendedLoading] = useState(true);
  const [administrationsLoading, setAdministrationsLoading] = useState(true);
  const [dismissals, setDismissals] = useState<DismissalRecord[]>([]);
  const [dismissalsLoading, setDismissalsLoading] = useState(true);

  useEffect(() => {
    // Pulse needs recent daily rows; Patterns/Trends need a deep MRS history that a
    // mixed 100-row limit would starve once daily pulse fills the window.
    void fetchCheckins(MIXED_CHECKIN_FETCH_LIMIT);
    void fetchMedications();
    void fetchChanges();
    void fetchLabResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userId) {
      setMrsCheckins([]);
      setMrsLoading(false);
      return;
    }

    let cancelled = false;
    setMrsLoading(true);

    void supabase
      .from('symptom_checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('mrs_complete', true)
      .order('checkin_date', { ascending: false })
      .limit(MRS_CHECKIN_FETCH_LIMIT)
      .then(({ data }) => {
        if (cancelled) return;
        setMrsCheckins((data as SymptomCheckin[]) ?? []);
        setMrsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
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
    if (!userId) {
      setAdministrations([]);
      setAdministrationsLoading(false);
      return;
    }

    let cancelled = false;
    setAdministrationsLoading(true);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ADMINISTRATIONS_DAYS);
    const cutoffISO = cutoff.toISOString();

    void supabase
      .from('medication_administrations')
      .select('*')
      .eq('user_id', userId)
      .gte('taken_at', cutoffISO)
      .order('taken_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setAdministrations((data as MedicationAdministration[]) ?? []);
        setAdministrationsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setDismissals([]);
      setDismissalsLoading(false);
      return;
    }

    let cancelled = false;
    setDismissalsLoading(true);

    void supabase
      .from('dismissed_insights')
      .select('insight_id, dismissed_at')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (cancelled) return;
        const rows =
          (data as { insight_id: string; dismissed_at: string }[] | null) ?? [];
        setDismissals(rows);
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

  const engineCheckins = useMemo(() => {
    const byId = new Map<string, SymptomCheckin>();
    for (const row of checkins) byId.set(row.id, row);
    for (const row of mrsCheckins) byId.set(row.id, row);
    return [...byId.values()].sort((a, b) => b.checkin_date.localeCompare(a.checkin_date));
  }, [checkins, mrsCheckins]);

  const engineResult = useMemo(() => {
    if (!profile || engineCheckins.length === 0) {
      return {
        primary: [] as Insight[],
        more: [] as Insight[],
        safeguarding: [] as Insight[],
        all: [] as Insight[],
      };
    }

    return runPatternEngine({
      checkins: engineCheckins,
      extendedSymptoms,
      medications,
      medicationChanges,
      administrations,
      labResults,
      profile,
      timezone,
    });
  }, [
    engineCheckins,
    extendedSymptoms,
    medications,
    medicationChanges,
    administrations,
    labResults,
    profile,
    timezone,
  ]);

  const { insights, primaryInsights, moreInsights, safeguardingInsights } = useMemo(() => {
    const all = filterDismissedInsights(engineResult.all, dismissals);
    const primary = filterDismissedInsights(engineResult.primary, dismissals);
    const more = filterDismissedInsights(engineResult.more, dismissals);
    const safeguarding = filterDismissedInsights(engineResult.safeguarding, dismissals);
    return {
      insights: all,
      primaryInsights: primary,
      moreInsights: more,
      safeguardingInsights: safeguarding,
    };
  }, [engineResult, dismissals]);

  const dismissInsight = useCallback(
    async (insightId: string) => {
      const dismissedAt = new Date().toISOString();
      setDismissals((prev) => [
        ...prev.filter((d) => d.insight_id !== insightId),
        { insight_id: insightId, dismissed_at: dismissedAt },
      ]);

      if (!userId) return;

      const { error } = await supabase.from('dismissed_insights').upsert(
        { user_id: userId, insight_id: insightId, dismissed_at: dismissedAt },
        { onConflict: 'user_id,insight_id' },
      );

      if (error) {
        console.error('Failed to dismiss insight:', error.message);
        setDismissals((prev) => prev.filter((d) => d.insight_id !== insightId));
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
    mrsLoading ||
    medsLoading ||
    changesLoading ||
    labsLoading ||
    extendedLoading ||
    administrationsLoading ||
    dismissalsLoading;

  return {
    insights,
    primaryInsights,
    moreInsights,
    safeguardingInsights,
    highPriority,
    positive,
    isLoading,
    dismissInsight,
    extendedSymptoms,
  };
}

export type { Insight };
