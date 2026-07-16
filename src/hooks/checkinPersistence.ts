import { supabase } from '../lib/supabase';
import type { SymptomCheckin } from '../types/database';

export interface CheckinBundleExtendedSymptom {
  symptom_key: string;
  severity_score: number;
}

export interface CheckinBundleAssessment {
  instrument_id: string;
  total_score: number;
  total_severity: string;
  subscale_scores: Record<string, unknown>;
  item_responses: Record<string, number>;
}

export interface CheckinBundleInput {
  checkinId: string | null;
  checkinDate: string;
  checkinPayload: Record<string, unknown>;
  extendedSymptoms: CheckinBundleExtendedSymptom[];
  assessment: CheckinBundleAssessment | null;
}

interface CheckinBundleQueryResult {
  data: unknown;
  error: { message: string } | null;
}

export interface CheckinPersistenceClient {
  rpc(
    functionName: string,
    args: Record<string, unknown>,
  ): PromiseLike<CheckinBundleQueryResult>;
}

export interface CheckinPersistenceDependencies {
  supabaseClient?: CheckinPersistenceClient;
}

export async function persistCheckinBundle(
  input: CheckinBundleInput,
  deps: CheckinPersistenceDependencies = {},
): Promise<SymptomCheckin> {
  const client = deps.supabaseClient ?? (supabase as unknown as CheckinPersistenceClient);
  const { data, error } = await client.rpc('save_checkin_bundle', {
    p_checkin_id: input.checkinId,
    p_checkin_date: input.checkinDate,
    p_checkin: input.checkinPayload,
    p_extended_symptoms: input.extendedSymptoms,
    p_assessment: input.assessment,
  });

  if (error) {
    throw new Error(`Failed to save check-in: ${error.message}`);
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Failed to save check-in: database returned no check-in');
  }

  return data as SymptomCheckin;
}
