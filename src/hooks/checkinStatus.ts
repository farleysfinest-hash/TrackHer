import { supabase } from '../lib/supabase';
import type { SymptomCheckin } from '../types/database';
import { hasMRSData } from '../utils/checkinHelpers';
import { addDaysISO, daysBetweenISO, dayOfWeekISO } from '../utils/localDate';

export interface CheckinStatusSnapshot {
  recentCheckins: SymptomCheckin[];
  latestCheckin: SymptomCheckin | null;
  daysLoggedThisMonthCount: number;
  totalDaysLoggedCount: number;
}

export interface CheckinStatus {
  hasCheckedInToday: boolean;
  /** True when today's row is a pulse (not a full MRS). */
  hasPulseToday: boolean;
  /** True when today's row has complete MRS data. */
  hasFullMrsToday: boolean;
  /**
   * True when at least one complete MRS check-in exists in the last 7 days
   * (including today). The weekly minimum is met; more full check-ins are welcome.
   */
  weeklyMinimumMet: boolean;
  todaysCheckin: SymptomCheckin | null;
  lastCheckinDate: string | null;
  daysSinceLastCheckin: number | null;
  /** True when the weekly check-in is still owed (schedule + missing MRS). */
  isDue: boolean;
  daysLoggedThisMonth: number | null;
  totalDaysLogged: number | null;
}

export const EMPTY_CHECKIN_STATUS: CheckinStatus = {
  hasCheckedInToday: false,
  hasPulseToday: false,
  hasFullMrsToday: false,
  weeklyMinimumMet: false,
  todaysCheckin: null,
  lastCheckinDate: null,
  daysSinceLastCheckin: null,
  isDue: true,
  daysLoggedThisMonth: null,
  totalDaysLogged: null,
};

function monthStartISO(todayStr: string): string {
  return `${todayStr.slice(0, 7)}-01`;
}

function hasRecentFullMrsCheckin(recentCheckins: SymptomCheckin[], todayStr: string): boolean {
  return recentCheckins.some((checkin) => {
    if (!hasMRSData(checkin)) return false;
    const difference = daysBetweenISO(checkin.checkin_date, todayStr);
    return difference >= 0 && difference < 7;
  });
}

export function computeCheckinStatus(
  snapshot: CheckinStatusSnapshot,
  todayStr: string,
  checkinDay: number | null,
): CheckinStatus {
  const todaysCheckin =
    snapshot.recentCheckins.find((checkin) => checkin.checkin_date === todayStr) ?? null;

  const latestCheckin = snapshot.latestCheckin;
  const lastCheckinDate = latestCheckin?.checkin_date ?? null;
  const daysSinceLastCheckin = latestCheckin
    ? daysBetweenISO(latestCheckin.checkin_date, todayStr)
    : null;

  const weeklyMinimumMet = hasRecentFullMrsCheckin(snapshot.recentCheckins, todayStr);
  const hasFullMrsToday = todaysCheckin !== null && hasMRSData(todaysCheckin);
  const hasPulseToday =
    todaysCheckin !== null && todaysCheckin.checkin_type === 'pulse' && !hasFullMrsToday;

  let isDue = false;
  if (hasFullMrsToday || weeklyMinimumMet) {
    isDue = false;
  } else if (checkinDay === null) {
    isDue = true;
  } else {
    isDue = dayOfWeekISO(todayStr) >= checkinDay;
  }

  return {
    hasCheckedInToday: todaysCheckin !== null,
    hasPulseToday,
    hasFullMrsToday,
    weeklyMinimumMet,
    todaysCheckin,
    lastCheckinDate,
    daysSinceLastCheckin,
    isDue,
    daysLoggedThisMonth:
      snapshot.daysLoggedThisMonthCount > 0 ? snapshot.daysLoggedThisMonthCount : null,
    totalDaysLogged: snapshot.totalDaysLoggedCount > 0 ? snapshot.totalDaysLoggedCount : null,
  };
}

export type CheckinStatusSupabaseClient = typeof supabase;

export interface LoadCheckinStatusSnapshotDependencies {
  supabaseClient?: CheckinStatusSupabaseClient;
}

export async function loadCheckinStatusSnapshot(
  userId: string,
  todayStr: string,
  deps: LoadCheckinStatusSnapshotDependencies = {},
): Promise<CheckinStatusSnapshot> {
  const client = deps.supabaseClient ?? supabase;
  const recentStart = addDaysISO(todayStr, -6);
  const monthStart = monthStartISO(todayStr);

  const [recentResult, latestResult, monthCountResult, totalCountResult] = await Promise.all([
    client
      .from('symptom_checkins')
      .select('*')
      .eq('user_id', userId)
      .gte('checkin_date', recentStart)
      .lte('checkin_date', todayStr)
      .order('checkin_date', { ascending: false }),
    client
      .from('symptom_checkins')
      .select('*')
      .eq('user_id', userId)
      .order('checkin_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from('symptom_checkins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('checkin_date', monthStart)
      .lte('checkin_date', todayStr),
    client
      .from('symptom_checkins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  const failedSources: string[] = [];

  if (recentResult.error) {
    failedSources.push('recent_checkins');
  }
  if (latestResult.error) {
    failedSources.push('latest_checkin');
  }
  if (monthCountResult.error) {
    failedSources.push('month_count');
  }
  if (totalCountResult.error) {
    failedSources.push('total_count');
  }

  if (failedSources.length > 0) {
    throw new Error(
      `Failed to load check-in status snapshot: ${failedSources.join(', ')}`,
    );
  }

  const recentData = recentResult.data as SymptomCheckin[] | null;
  const latestData = latestResult.data as SymptomCheckin | null;

  return {
    recentCheckins: recentData ?? [],
    latestCheckin: latestData,
    daysLoggedThisMonthCount: monthCountResult.count ?? 0,
    totalDaysLoggedCount: totalCountResult.count ?? 0,
  };
}
