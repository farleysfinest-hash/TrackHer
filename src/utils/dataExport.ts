import { supabase } from '../lib/supabase';

/** PostgREST default max is 1000; page below that and walk until a short page. */
const PAGE_SIZE = 500;

export interface ExportBundle {
  exported_at: string;
  profile: Record<string, unknown> | null;
  symptom_checkins: Record<string, unknown>[];
  extended_symptom_logs: Record<string, unknown>[];
  quick_log_events: Record<string, unknown>[];
  medications: Record<string, unknown>[];
  medication_changes: Record<string, unknown>[];
  medication_administrations: Record<string, unknown>[];
  dose_logs: Record<string, unknown>[];
  lab_results: Record<string, unknown>[];
  user_symptom_selections: Record<string, unknown>[];
  assessment_results: Record<string, unknown>[];
  dismissed_insights: Record<string, unknown>[];
  checkin_drafts: Record<string, unknown>[];
  reminder_schedule: Record<string, unknown>[];
  ai_insights: Record<string, unknown>[];
}

async function checkedQuery(
  userId: string,
  table: string,
  orderCol?: string,
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = supabase.from(table).select('*').eq('user_id', userId);
    if (orderCol) {
      query = query.order(orderCol, { ascending: true });
    }
    const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Failed to export ${table}: ${error.message}`);

    const page = (data as Record<string, unknown>[] | null) ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}

export async function exportUserData(): Promise<ExportBundle> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const profileRes = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (profileRes.error) throw new Error(`Failed to export profile: ${profileRes.error.message}`);

  const [
    checkins,
    extended,
    quickLogs,
    meds,
    medChanges,
    medAdmins,
    doseLogs,
    labs,
    selections,
    assessments,
    dismissed,
    drafts,
    reminders,
    aiInsights,
  ] = await Promise.all([
    checkedQuery(userId, 'symptom_checkins', 'checkin_date'),
    checkedQuery(userId, 'extended_symptom_logs', 'created_at'),
    checkedQuery(userId, 'quick_log_events', 'logged_at'),
    checkedQuery(userId, 'medications', 'start_date'),
    checkedQuery(userId, 'medication_changes', 'change_date'),
    checkedQuery(userId, 'medication_administrations', 'taken_at'),
    checkedQuery(userId, 'dose_logs', 'logged_at'),
    checkedQuery(userId, 'lab_results', 'draw_date'),
    checkedQuery(userId, 'user_symptom_selections'),
    checkedQuery(userId, 'assessment_results', 'created_at'),
    checkedQuery(userId, 'dismissed_insights', 'dismissed_at'),
    checkedQuery(userId, 'checkin_drafts'),
    checkedQuery(userId, 'reminder_schedule'),
    checkedQuery(userId, 'ai_insights', 'generated_at'),
  ]);

  return {
    exported_at: new Date().toISOString(),
    profile: (profileRes.data as Record<string, unknown> | null) ?? null,
    symptom_checkins: checkins,
    extended_symptom_logs: extended,
    quick_log_events: quickLogs,
    medications: meds,
    medication_changes: medChanges,
    medication_administrations: medAdmins,
    dose_logs: doseLogs,
    lab_results: labs,
    user_symptom_selections: selections,
    assessment_results: assessments,
    dismissed_insights: dismissed,
    checkin_drafts: drafts,
    reminder_schedule: reminders,
    ai_insights: aiInsights,
  };
}

export function downloadJson(data: ExportBundle, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
