import { supabase } from '../lib/supabase';
import { buildAiFactsPacket, type AiFactsPacketInput } from './aiFactsPacket';
import { hashAiFactsPacket, writeAiInsightCache } from './aiInsightsCache';
import { invokeMonitor } from '../hooks/useAiAssistant';
import { buildGapCoachMessage } from '../components/insights/GapCoachCard';
import { hasMRSData } from './checkinHelpers';

const MONITOR_DAY_KEY = 'trackher_ai_monitor_day';

/**
 * Fire-and-forget companion monitor after a full weekly MRS save.
 * Dedupes to once per local calendar day.
 */
export function triggerAiMonitorAfterMrsCheckin(input: AiFactsPacketInput): void {
  const userId = input.profile?.id;
  if (!userId) return;

  const today = new Date().toISOString().slice(0, 10);
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(MONITOR_DAY_KEY) === today) {
      return;
    }
  } catch {
    // ignore storage failures
  }

  void (async () => {
    try {
      const facts = buildAiFactsPacket(input);
      const hash = hashAiFactsPacket(facts);
      const result = await invokeMonitor(facts);
      if (!result) return;

      const mrsCount = input.checkins.filter(hasMRSData).length;
      const activeMeds = input.medications.filter((m) => m.is_active && !m.end_date).length;
      const ruleGap = buildGapCoachMessage(activeMeds, mrsCount);
      const payload = {
        note: result.note,
        gapHint: result.gapHint ?? ruleGap,
      };

      await writeAiInsightCache(userId, 'monitor_note', hash, payload, 7);
      try {
        localStorage.setItem(MONITOR_DAY_KEY, today);
      } catch {
        // ignore
      }
    } catch (e) {
      console.warn('AI monitor failed:', e);
    }
  })();
}

/** Load a minimal facts context from current user tables for post-save monitor. */
export async function loadMinimalAiContextForMonitor(
  userId: string,
  timezone: string,
): Promise<AiFactsPacketInput | null> {
  const [
    profileRes,
    checkinsRes,
    medsRes,
    changesRes,
    labsRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase
      .from('symptom_checkins')
      .select('*')
      .eq('user_id', userId)
      .order('checkin_date', { ascending: false })
      .limit(120),
    supabase.from('medications').select('*').eq('user_id', userId).eq('is_active', true),
    supabase
      .from('medication_changes')
      .select('*')
      .eq('user_id', userId)
      .order('change_date', { ascending: false })
      .limit(20),
    supabase
      .from('lab_results')
      .select('*')
      .eq('user_id', userId)
      .order('draw_date', { ascending: false })
      .limit(8),
  ]);

  if (!profileRes.data) return null;

  return {
    timezone,
    profile: profileRes.data,
    checkins: checkinsRes.data ?? [],
    medications: medsRes.data ?? [],
    medicationChanges: changesRes.data ?? [],
    labResults: labsRes.data ?? [],
    insights: [],
  };
}
