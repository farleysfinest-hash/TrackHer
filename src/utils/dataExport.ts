import { supabase } from '../lib/supabase';
import { saveOrShareBlob } from './nativeExport';
import { getProfileAvatarStamp, getProfileAvatarUrl } from './profileAvatar';
import { fetchAllPages } from './pagedQuery';
import type { Profile } from '../types/database';

export interface ExportBundle {
  exported_at: string;
  profile: Record<string, unknown> | null;
  /**
   * Signed, time-limited link to the profile picture, which lives in Storage
   * rather than in the profile row. Null when there is no picture. Download it
   * while the link is fresh — it expires an hour after the export.
   */
  profile_picture_url: string | null;
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
  try {
    return await fetchAllPages<Record<string, unknown>>(async (from, to) => {
      let query = supabase.from(table).select('*').eq('user_id', userId);
      if (orderCol) {
        query = query.order(orderCol, { ascending: true });
      }
      const { data, error } = await query.range(from, to);
      return { data: data as Record<string, unknown>[] | null, error };
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to export ${table}: ${message}`);
  }
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

  const profile = (profileRes.data as Record<string, unknown> | null) ?? null;
  const hasAvatar = getProfileAvatarStamp(profile as Profile | null) !== null;

  return {
    exported_at: new Date().toISOString(),
    profile,
    profile_picture_url: hasAvatar ? await getProfileAvatarUrl(userId) : null,
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

export async function downloadJson(data: ExportBundle, filename: string): Promise<void> {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  await saveOrShareBlob(blob, filename);
}

/**
 * Neutralise CSV formula injection. Excel / Sheets treat a cell starting with
 * `=`, `+`, `-`, or `@` as a formula when the file opens. Free-text notes flow
 * straight into exports, so prefix those values with a single quote.
 */
export function escapeCsvCell(value: unknown): string {
  let text: string;
  if (value === null || value === undefined) {
    text = '';
  } else if (typeof value === 'object') {
    text = JSON.stringify(value);
  } else {
    text = String(value);
  }

  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const header = columns.map(escapeCsvCell).join(',');
  const body = rows.map((row) => columns.map((col) => escapeCsvCell(row[col])).join(','));
  return [header, ...body].join('\n');
}

/** Tables included in the spreadsheet-friendly export (convenience; JSON remains complete). */
const CSV_TABLES: Array<{ key: keyof ExportBundle; filename: string }> = [
  { key: 'symptom_checkins', filename: 'symptom_checkins.csv' },
  { key: 'medications', filename: 'medications.csv' },
  { key: 'medication_administrations', filename: 'medication_administrations.csv' },
  { key: 'lab_results', filename: 'lab_results.csv' },
  { key: 'quick_log_events', filename: 'quick_log_events.csv' },
  { key: 'extended_symptom_logs', filename: 'extended_symptom_logs.csv' },
];

/**
 * One CSV file with a leading `table` column so Excel can filter without a zip dependency.
 * Formula-dangerous cells are escaped via {@link escapeCsvCell}.
 */
export function buildCombinedCsv(data: ExportBundle): string {
  const chunks: string[] = [];
  for (const { key } of CSV_TABLES) {
    const rows = data[key];
    if (!Array.isArray(rows) || rows.length === 0) continue;
    const withTable = rows.map((row) => ({ table: key, ...row }));
    chunks.push(rowsToCsv(withTable));
  }
  return chunks.join('\n\n');
}

export async function downloadCsv(data: ExportBundle, filename: string): Promise<void> {
  const csv = buildCombinedCsv(data);
  const blob = new Blob([csv || 'table\n'], { type: 'text/csv;charset=utf-8' });
  await saveOrShareBlob(blob, filename);
}
