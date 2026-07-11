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
import { buildAssessmentScore, saveAssessmentResult } from './assessmentPersistence';
import { isInstrumentComplete } from '../data/instruments/scoring';
import { MRS_INSTRUMENT } from '../data/instruments/mrs';

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

function buildCheckinPayload(data: CheckinInput, userId: string, timezone: string) {
  const checkinType = data.checkinType ?? 'full';
  const isPulse = checkinType === 'pulse';
  const checkinDate = data.checkinDate ?? getLocalDateISO(timezone);
  const today = getLocalDateISO(timezone);

  const payload: Record<string, unknown> = {
    user_id: userId,
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

function addDaysISO(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${month}-${day}`;
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
      userId,
      getTimezone(),
    );

    const { data: inserted, error: insertError } = await supabase
      .from('symptom_checkins')
      .insert(payload)
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      return null;
    }

    const checkin = inserted as SymptomCheckin;

    if (data.extendedSymptoms.length > 0) {
      const { error: extError } = await supabase.from('extended_symptom_logs').insert(
        data.extendedSymptoms.map((s) => ({
          user_id: userId,
          checkin_id: checkin.id,
          symptom_key: s.symptom_key,
          severity_score: s.severity,
        })),
      );
      if (extError) {
        setError(extError.message);
        return null;
      }
    }

    if (data.checkinType !== 'pulse') {
      const instrumentId = data.instrumentId ?? 'mrs';
      const assessmentScore = buildAssessmentScore(data.mrsScores, instrumentId, checkin.checkin_date);
      if (assessmentScore?.isComplete) {
        await saveAssessmentResult(
          userId,
          assessmentScore,
          checkin.id,
          `${checkin.checkin_date}T12:00:00.000Z`,
        );
      }
    }

    await fetchCheckins();
    return checkin;
  };

  const updateCheckin = async (id: string, data: CheckinInput): Promise<boolean> => {
    const userId = getUserId();
    if (!userId) return false;

    const payload = buildCheckinPayload(data, userId, getTimezone());
    delete payload.user_id;
    delete payload.checkin_date;

    const { error: updateError } = await supabase
      .from('symptom_checkins')
      .update(payload)
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    await supabase.from('extended_symptom_logs').delete().eq('checkin_id', id);

    if (data.extendedSymptoms.length > 0) {
      const { error: extError } = await supabase.from('extended_symptom_logs').insert(
        data.extendedSymptoms.map((s) => ({
          user_id: userId,
          checkin_id: id,
          symptom_key: s.symptom_key,
          severity_score: s.severity,
        })),
      );
      if (extError) {
        setError(extError.message);
        return false;
      }
    }

    const existingCheckin = checkins.find((c) => c.id === id);
    const checkinDate =
      existingCheckin?.checkin_date ?? data.checkinDate ?? getLocalDateISO(getTimezone());

    const instrumentId = data.instrumentId ?? 'mrs';
    if (data.checkinType !== 'pulse') {
      const assessmentScore = buildAssessmentScore(data.mrsScores, instrumentId, checkinDate);
      if (assessmentScore?.isComplete) {
        await saveAssessmentResult(
          userId,
          assessmentScore,
          id,
          `${checkinDate}T12:00:00.000Z`,
        );
      }
    }

    await fetchCheckins();
    return true;
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
      const now = new Date();
      for (let w = 0; w < 52; w++) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - w * 7 - 6);
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - w * 7);
        const hasCheckin = uniqueDates.some((d) => {
          const dt = new Date(d + 'T12:00:00');
          return dt >= weekStart && dt <= weekEnd;
        });
        if (hasCheckin) streak++;
        else if (w > 0) break;
      }
      return streak;
    }

    let streak = 0;
    const now = new Date();
    for (let m = 0; m < 24; m++) {
      const month = now.getMonth() - m;
      const year = now.getFullYear() + Math.floor(month / 12);
      const normalizedMonth = ((month % 12) + 12) % 12;
      const hasCheckin = uniqueDates.some((d) => {
        const dt = new Date(d + 'T12:00:00');
        return dt.getFullYear() === year && dt.getMonth() === normalizedMonth;
      });
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
