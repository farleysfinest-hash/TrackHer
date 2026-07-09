import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { IS_DEV_MODE } from '../lib/devMode';
import { MOCK_USER } from '../lib/mockData';
import {
  getDevCheckins,
  setDevCheckins,
  getDevExtendedSymptomLogs,
  setDevExtendedSymptomLogs,
} from '../lib/devStore';
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
  calculateMRS,
  INITIAL_MRS_SCORES,
  MRS_CANONICAL_KEYS,
  LEGACY_MRS_EXTRA_KEYS,
} from '../utils/checkinHelpers';
import type { MRSSymptomKey, MRSScoresMap } from '../utils/checkinHelpers';
import { buildAssessmentScore, saveAssessmentResult } from './assessmentPersistence';

export interface CheckinInput {
  wellbeingScore: number | null;
  mrsScores: Record<string, MRSScore | null>;
  extendedSymptoms: Array<{ symptom_key: string; severity: MRSScore }>;
  notes: string;
  checkinDate?: string;
  instrumentId?: string;
  checkinType?: CheckinType;
}

function buildCheckinPayload(data: CheckinInput, userId: string) {
  const checkinType = data.checkinType ?? 'full';
  const isPulse = checkinType === 'pulse';

  const payload: Record<string, unknown> = {
    user_id: userId,
    checkin_date: data.checkinDate ?? getLocalDateISO(),
    overall_wellbeing: data.wellbeingScore,
    notes: isPulse ? null : data.notes || null,
    checkin_type: checkinType,
  };

  for (const key of MRS_CANONICAL_KEYS) {
    payload[key] = isPulse ? null : (data.mrsScores[key as MRSSymptomKey] ?? null);
  }
  for (const key of LEGACY_MRS_EXTRA_KEYS) {
    payload[key] = null;
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

function scoresFromInput(mrsScores: Record<string, MRSScore | null>): MRSScoresMap {
  const map = { ...INITIAL_MRS_SCORES };
  for (const key of MRS_CANONICAL_KEYS) {
    map[key] = (mrsScores[key] ?? null) as MRSScore | null;
  }
  return map;
}

function buildDevCheckin(data: CheckinInput, id: string, userId: string): SymptomCheckin {
  const checkinType = data.checkinType ?? 'full';
  const isPulse = checkinType === 'pulse';
  const mrsMap = isPulse ? { ...INITIAL_MRS_SCORES } : scoresFromInput(data.mrsScores);
  const checkinDate = data.checkinDate ?? getLocalDateISO();
  const mrs = isPulse
    ? { total: 0, somatic: 0, psychological: 0, urogenital: 0 }
    : calculateMRS(mrsMap);

  return {
    id,
    user_id: userId,
    checkin_date: checkinDate,
    hot_flashes: mrsMap.hot_flashes,
    heart_discomfort: mrsMap.heart_discomfort,
    sleep_problems: mrsMap.sleep_problems,
    depressed_mood: mrsMap.depressed_mood,
    irritability: mrsMap.irritability,
    anxiety: mrsMap.anxiety,
    exhaustion: mrsMap.exhaustion,
    sexual_problems: mrsMap.sexual_problems,
    bladder_problems: mrsMap.bladder_problems,
    vaginal_dryness: mrsMap.vaginal_dryness,
    joint_muscle_pain: mrsMap.joint_muscle_pain,
    dry_itchy_skin: null,
    brain_fog: null,
    irregular_periods: null,
    heavy_bleeding: null,
    misophonia: null,
    checkin_type: checkinType,
    total_score: mrs.total,
    somatic_score: mrs.somatic,
    psychological_score: mrs.psychological,
    urogenital_score: mrs.urogenital,
    overall_wellbeing: data.wellbeingScore,
    notes: isPulse ? null : data.notes || null,
    created_at: new Date().toISOString(),
  };
}

function computeDevStreak(timezone: string, frequency: string): number {
  const allCheckins = getDevCheckins();
  if (allCheckins.length === 0) return 0;

  const dates = allCheckins.map((c) => c.checkin_date);
  const uniqueDates = [...new Set(dates)].sort((a, b) => b.localeCompare(a));

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
}

function saveDevExtendedSymptoms(
  checkinId: string,
  userId: string,
  symptoms: Array<{ symptom_key: string; severity: MRSScore }>,
): void {
  const others = getDevExtendedSymptomLogs().filter((l) => l.checkin_id !== checkinId);
  const newLogs: ExtendedSymptomLog[] = symptoms.map((s, i) => ({
    id: `ext-dev-${checkinId}-${i}`,
    user_id: userId,
    checkin_id: checkinId,
    symptom_key: s.symptom_key,
    severity: null,
    severity_score: s.severity,
    created_at: new Date().toISOString(),
  }));
  setDevExtendedSymptomLogs([...others, ...newLogs]);
}

export function useCheckins() {
  const [checkins, setCheckins] = useState<SymptomCheckin[]>(
    IS_DEV_MODE ? [...getDevCheckins()] : [],
  );
  const [isLoading, setIsLoading] = useState(!IS_DEV_MODE);
  const [error, setError] = useState<string | null>(null);

  const getUserId = () => useAuthStore.getState().user?.id;
  const getTimezone = () =>
    getResolvedTimezone(useAuthStore.getState().profile?.timezone);

  const syncDevCheckins = useCallback(() => {
    const sorted = [...getDevCheckins()].sort((a, b) =>
      b.checkin_date.localeCompare(a.checkin_date),
    );
    setCheckins(sorted);
    setIsLoading(false);
  }, []);

  const fetchCheckins = useCallback(async (limit = 50) => {
    if (IS_DEV_MODE) {
      const sorted = [...getDevCheckins()]
        .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date))
        .slice(0, limit);
      setCheckins(sorted);
      setIsLoading(false);
      return;
    }

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
    if (IS_DEV_MODE) {
      const sorted = [...getDevCheckins()].sort((a, b) =>
        b.checkin_date.localeCompare(a.checkin_date),
      );
      const rows = sorted.slice(offset, offset + pageSize);
      return { data: rows, hasMore: offset + pageSize < sorted.length };
    }

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
    if (IS_DEV_MODE) {
      const checkin = getDevCheckins().find((c) => c.id === id);
      if (!checkin) return null;
      const extendedSymptoms = getDevExtendedSymptomLogs().filter((l) => l.checkin_id === id);
      return { checkin, extendedSymptoms };
    }

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
    if (IS_DEV_MODE) {
      const sorted = [...getDevCheckins()].sort((a, b) =>
        b.checkin_date.localeCompare(a.checkin_date),
      );
      return sorted[0] ?? null;
    }

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
    if (IS_DEV_MODE) {
      const today = getLocalDateISO(getTimezone());
      return getDevCheckins().find((c) => c.checkin_date === today) ?? null;
    }

    const userId = getUserId();
    if (!userId) return null;

    const today = getLocalDateISO(getTimezone());
    const { data } = await supabase
      .from('symptom_checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('checkin_date', today)
      .maybeSingle();

    return data ? (data as SymptomCheckin) : null;
  };

  const createCheckin = async (data: CheckinInput): Promise<SymptomCheckin | null> => {
    const userId = getUserId();
    if (!userId) return null;

    if (IS_DEV_MODE) {
      const checkinDate = data.checkinDate ?? getLocalDateISO(getTimezone());
      const id = `checkin-dev-${Date.now()}`;
      const newCheckin = buildDevCheckin({ ...data, checkinDate }, id, MOCK_USER.id);

      const filtered = getDevCheckins().filter((c) => c.checkin_date !== checkinDate);
      setDevCheckins([newCheckin, ...filtered]);

      if (data.extendedSymptoms.length > 0) {
        saveDevExtendedSymptoms(id, MOCK_USER.id, data.extendedSymptoms);
      }

      if (data.checkinType !== 'pulse') {
        const instrumentId = data.instrumentId ?? 'mrs';
        const assessmentScore = buildAssessmentScore(
          data.mrsScores,
          instrumentId,
          checkinDate,
        );
        if (assessmentScore) {
          await saveAssessmentResult(
            MOCK_USER.id,
            assessmentScore,
            id,
            `${checkinDate}T12:00:00.000Z`,
          );
        }
      }

      syncDevCheckins();
      console.log('[DEV] Check-in saved:', newCheckin);
      return newCheckin;
    }

    const payload = buildCheckinPayload(
      { ...data, checkinDate: data.checkinDate ?? getLocalDateISO(getTimezone()) },
      userId,
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
      if (assessmentScore) {
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

    if (IS_DEV_MODE) {
      const existing = getDevCheckins().find((c) => c.id === id);
      if (!existing) return false;

      const updated = buildDevCheckin(data, id, MOCK_USER.id);
      updated.checkin_date = existing.checkin_date;
      updated.created_at = existing.created_at;

      setDevCheckins(getDevCheckins().map((c) => (c.id === id ? updated : c)));
      saveDevExtendedSymptoms(id, MOCK_USER.id, data.extendedSymptoms);

      const instrumentId = data.instrumentId ?? 'mrs';
      if (data.checkinType !== 'pulse') {
        const assessmentScore = buildAssessmentScore(
          data.mrsScores,
          instrumentId,
          existing.checkin_date,
        );
        if (assessmentScore) {
          await saveAssessmentResult(
            MOCK_USER.id,
            assessmentScore,
            id,
            `${existing.checkin_date}T12:00:00.000Z`,
          );
        }
      }

      syncDevCheckins();
      console.log('[DEV] Check-in updated:', updated);
      return true;
    }

    const payload = buildCheckinPayload(data, userId);
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
      if (assessmentScore) {
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
    if (IS_DEV_MODE) {
      setDevCheckins(getDevCheckins().filter((c) => c.id !== id));
      setDevExtendedSymptomLogs(getDevExtendedSymptomLogs().filter((l) => l.checkin_id !== id));
      syncDevCheckins();
      console.log('[DEV] Check-in deleted:', id);
      return true;
    }

    const { error: deleteError } = await supabase.from('symptom_checkins').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      return false;
    }
    await fetchCheckins();
    return true;
  };

  const getStreak = async (): Promise<number> => {
    if (IS_DEV_MODE) {
      const frequency = useAuthStore.getState().profile?.checkin_frequency ?? 'daily';
      return computeDevStreak(getTimezone(), frequency);
    }

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
    getLastCheckin,
    createCheckin,
    updateCheckin,
    deleteCheckin,
    getStreak,
  };
}
