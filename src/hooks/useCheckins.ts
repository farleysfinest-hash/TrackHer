import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type {
  SymptomCheckin,
  ExtendedSymptomLog,
  MRSScore,
  CheckinType,
} from '../types/database';
import {
  getLocalDateISO,
  getResolvedTimezone,
  MRS_CANONICAL_KEYS,
  LEGACY_MRS_EXTRA_KEYS,
} from '../utils/checkinHelpers';
import type { MRSSymptomKey } from '../utils/checkinHelpers';
import { buildAssessmentScore } from './assessmentPersistence';
import {
  persistCheckinBundle,
  type CheckinBundleAssessment,
} from './checkinPersistence';
import { isInstrumentComplete } from '../data/instruments/scoring';
import { MRS_INSTRUMENT } from '../data/instruments/mrs';
import { addDaysISO, addMonthsISO } from '../utils/localDate';

export interface CheckinInput {
  energyLevel: number | null;
  moodLevel: number | null;
  sleepQuality: number | null;
  mrsScores: Record<string, MRSScore | null>;
  extendedSymptoms: Array<{ symptom_key: string; severity: MRSScore }>;
  notes: string;
  checkinDate?: string;
  instrumentId?: string;
  checkinType?: CheckinType;
}

function buildCheckinPayload(data: CheckinInput, timezone: string) {
  const checkinType = data.checkinType ?? 'full';
  const isPulse = checkinType === 'pulse';
  const checkinDate = data.checkinDate ?? getLocalDateISO(timezone);
  const today = getLocalDateISO(timezone);

  const payload: Record<string, unknown> = {
    checkin_date: checkinDate,
    energy_level: data.energyLevel,
    mood_level: data.moodLevel,
    sleep_quality: data.sleepQuality ?? null,
    notes: isPulse ? null : data.notes || null,
    checkin_type: checkinType,
    is_backdated: checkinDate !== today,
  };

  for (const key of MRS_CANONICAL_KEYS) {
    payload[key] = isPulse ? null : (data.mrsScores[key as MRSSymptomKey] ?? null);
  }
  for (const key of LEGACY_MRS_EXTRA_KEYS) {
    payload[key] = null;
  }

  if (!isPulse) {
    payload.mrs_complete = isInstrumentComplete(data.mrsScores, MRS_INSTRUMENT);
  } else {
    payload.mrs_complete = false;
  }

  return payload;
}

function buildAssessmentPayload(
  data: CheckinInput,
  checkinDate: string,
): CheckinBundleAssessment | null {
  if (data.checkinType === 'pulse') return null;

  const instrumentId = data.instrumentId ?? 'mrs';
  const score = buildAssessmentScore(data.mrsScores, instrumentId, checkinDate);
  if (
    !score?.isComplete ||
    score.total === null ||
    score.totalSeverity === null
  ) {
    return null;
  }

  return {
    instrument_id: score.instrumentId,
    total_score: score.total,
    total_severity: score.totalSeverity,
    subscale_scores: score.subscales,
    item_responses: score.itemResponses,
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Failed to save check-in';
}

export function useCheckins() {
  const [checkins, setCheckins] = useState<SymptomCheckin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getUserId = () => useAuthStore.getState().user?.id;
  const getTimezone = () =>
    getResolvedTimezone(useAuthStore.getState().profile?.timezone);

  const fetchCheckins = useCallback(async (limit = 50) => {
    const userId = getUserId();
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('symptom_checkins')
      .select('*')
      .eq('user_id', userId)
      .order('checkin_date', { ascending: false })
      .limit(limit);

    setIsLoading(false);
    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setCheckins((data as SymptomCheckin[]) ?? []);
  }, []);

  const fetchCheckinsPage = useCallback(async (offset: number, pageSize = 10) => {
    const userId = getUserId();
    if (!userId) return { data: [], hasMore: false };

    const { data, error: fetchError } = await supabase
      .from('symptom_checkins')
      .select('*')
      .eq('user_id', userId)
      .order('checkin_date', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (fetchError) {
      setError(fetchError.message);
      return { data: [], hasMore: false };
    }

    const rows = (data as SymptomCheckin[]) ?? [];
    return { data: rows, hasMore: rows.length === pageSize };
  }, []);

  const fetchCheckinDetail = useCallback(async (
    id: string,
  ): Promise<{ checkin: SymptomCheckin; extendedSymptoms: ExtendedSymptomLog[] } | null> => {
    const { data: checkin, error: checkinError } = await supabase
      .from('symptom_checkins')
      .select('*')
      .eq('id', id)
      .single();

    if (checkinError || !checkin) return null;

    const { data: extended } = await supabase
      .from('extended_symptom_logs')
      .select('*')
      .eq('checkin_id', id);

    return {
      checkin: checkin as SymptomCheckin,
      extendedSymptoms: (extended as ExtendedSymptomLog[]) ?? [],
    };
  }, []);

  const getLastCheckin = async (): Promise<SymptomCheckin | null> => {
    const userId = getUserId();
    if (!userId) return null;

    const { data } = await supabase
      .from('symptom_checkins')
      .select('*')
      .eq('user_id', userId)
      .order('checkin_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ? (data as SymptomCheckin) : null;
  };

  const getTodaysCheckin = async (): Promise<SymptomCheckin | null> => {
    const today = getLocalDateISO(getTimezone());
    return getCheckinForDate(today);
  };

  const getCheckinForDate = async (date: string): Promise<SymptomCheckin | null> => {
    const userId = getUserId();
    if (!userId) return null;

    const { data } = await supabase
      .from('symptom_checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('checkin_date', date)
      .maybeSingle();

    return data ? (data as SymptomCheckin) : null;
  };

  const getCoverage = async (): Promise<{ covered: number; window: number } | null> => {
    const frequency = useAuthStore.getState().profile?.checkin_frequency ?? 'daily';
    if (frequency !== 'daily') return null;

    const window = 14;
    const timezone = getTimezone();
    const today = getLocalDateISO(timezone);
    const since = addDaysISO(today, -(window - 1));

    const userId = getUserId();
    if (!userId) return null;

    const { data } = await supabase
      .from('symptom_checkins')
      .select('checkin_date')
      .eq('user_id', userId)
      .gte('checkin_date', since)
      .lte('checkin_date', today);

    const dates = new Set((data ?? []).map((d) => d.checkin_date as string));
    return { covered: dates.size, window };
  };

  const createCheckin = async (data: CheckinInput): Promise<SymptomCheckin | null> => {
    const userId = getUserId();
    if (!userId) return null;

    const payload = buildCheckinPayload(
      { ...data, checkinDate: data.checkinDate ?? getLocalDateISO(getTimezone()) },
      getTimezone(),
    );
    const checkinDate = payload.checkin_date as string;

    try {
      setError(null);
      const checkin = await persistCheckinBundle({
        checkinId: null,
        checkinDate,
        checkinPayload: payload,
        extendedSymptoms: data.extendedSymptoms.map((symptom) => ({
          symptom_key: symptom.symptom_key,
          severity_score: symptom.severity,
        })),
        assessment: buildAssessmentPayload(data, checkinDate),
      });

      await fetchCheckins();
      return checkin;
    } catch (saveError) {
      setError(getErrorMessage(saveError));
      return null;
    }
  };

  const updateCheckin = async (id: string, data: CheckinInput): Promise<boolean> => {
    const userId = getUserId();
    if (!userId) return false;

    const payload = buildCheckinPayload(data, getTimezone());
    const existingCheckin = checkins.find((c) => c.id === id);
    const checkinDate =
      existingCheckin?.checkin_date ?? data.checkinDate ?? getLocalDateISO(getTimezone());

    try {
      setError(null);
      await persistCheckinBundle({
        checkinId: id,
        checkinDate,
        checkinPayload: payload,
        extendedSymptoms: data.extendedSymptoms.map((symptom) => ({
          symptom_key: symptom.symptom_key,
          severity_score: symptom.severity,
        })),
        assessment: buildAssessmentPayload(data, checkinDate),
      });

      await fetchCheckins();
      return true;
    } catch (saveError) {
      setError(getErrorMessage(saveError));
      return false;
    }
  };

  const deleteCheckin = async (id: string): Promise<boolean> => {
    const { error: deleteError } = await supabase.from('symptom_checkins').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      return false;
    }
    await fetchCheckins();
    return true;
  };

  const getStreak = async (): Promise<number> => {
    const userId = getUserId();
    if (!userId) return 0;

    const frequency = useAuthStore.getState().profile?.checkin_frequency ?? 'daily';
    const timezone = getTimezone();

    const { data } = await supabase
      .from('symptom_checkins')
      .select('checkin_date')
      .eq('user_id', userId)
      .order('checkin_date', { ascending: false });

    if (!data || data.length === 0) return 0;

    const dates = (data as { checkin_date: string }[]).map((d) => d.checkin_date);
    const uniqueDates = [...new Set(dates)];

    if (frequency === 'daily') {
      let streak = 0;
      const today = getLocalDateISO(timezone);
      let cursorDate = today;

      for (let i = 0; i < 365; i++) {
        if (uniqueDates.includes(cursorDate)) {
          streak++;
          cursorDate = addDaysISO(cursorDate, -1);
        } else if (i === 0) {
          cursorDate = addDaysISO(cursorDate, -1);
          continue;
        } else {
          break;
        }
      }
      return streak;
    }

    if (frequency === 'weekly') {
      let streak = 0;
      const today = getLocalDateISO(timezone);
      for (let w = 0; w < 52; w++) {
        const weekEnd = addDaysISO(today, -w * 7);
        const weekStart = addDaysISO(weekEnd, -6);
        const hasCheckin = uniqueDates.some((d) => d >= weekStart && d <= weekEnd);
        if (hasCheckin) streak++;
        else if (w > 0) break;
      }
      return streak;
    }

    let streak = 0;
    const today = getLocalDateISO(timezone);
    const firstOfMonth = `${today.slice(0, 7)}-01`;
    for (let m = 0; m < 24; m++) {
      const key = addMonthsISO(firstOfMonth, -m).slice(0, 7);
      const hasCheckin = uniqueDates.some((d) => d.slice(0, 7) === key);
      if (hasCheckin) streak++;
      else if (m > 0) break;
    }
    return streak;
  };

  return {
    checkins,
    isLoading,
    error,
    fetchCheckins,
    fetchCheckinsPage,
    fetchCheckinDetail,
    getTodaysCheckin,
    getCheckinForDate,
    getLastCheckin,
    createCheckin,
    updateCheckin,
    deleteCheckin,
    getStreak,
    getCoverage,
  };
}
