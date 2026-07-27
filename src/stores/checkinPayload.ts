import type {
  CheckinType,
  BleedingFlow,
  MRSScore,
} from '../types/database';
import {
  getLocalDateISO,
  MRS_CANONICAL_KEYS,
  LEGACY_MRS_EXTRA_KEYS,
} from '../utils/checkinHelpers';
import type { MRSSymptomKey } from '../utils/checkinHelpers';
import { buildAssessmentScore } from '../hooks/assessmentPersistence';
import {
  type CheckinBundleAssessment,
} from '../hooks/checkinPersistence';
import { isInstrumentComplete } from '../data/instruments/scoring';
import { MRS_INSTRUMENT } from '../data/instruments/mrs';

export interface CheckinInput {
  energyLevel: number | null;
  moodLevel: number | null;
  sleepQuality: number | null;
  bleedingFlow?: BleedingFlow | null;
  mrsScores: Record<string, MRSScore | null>;
  extendedSymptoms: Array<{ symptom_key: string; severity: MRSScore }>;
  notes: string;
  checkinDate?: string;
  instrumentId?: string;
  checkinType?: CheckinType;
}

export function buildCheckinPayload(data: CheckinInput, timezone: string) {
  const checkinType = data.checkinType ?? 'full';
  const isPulse = checkinType === 'pulse';
  const checkinDate = data.checkinDate ?? getLocalDateISO(timezone);
  const today = getLocalDateISO(timezone);

  const payload: Record<string, unknown> = {
    checkin_date: checkinDate,
    energy_level: data.energyLevel,
    mood_level: data.moodLevel,
    sleep_quality: data.sleepQuality ?? null,
    bleeding_flow: data.bleedingFlow ?? null,
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

export function buildAssessmentPayload(
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

export function getCheckinErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Failed to save check-in';
}
