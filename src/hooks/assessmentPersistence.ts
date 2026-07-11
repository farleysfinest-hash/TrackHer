import { supabase } from '../lib/supabase';
import type { InstrumentScore } from '../types/instruments';
import { getInstrumentById } from '../data/instruments/registry';
import { calculateInstrumentScore } from '../utils/checkinHelpers';

export async function saveAssessmentResult(
  userId: string,
  score: InstrumentScore,
  checkinId: string,
  assessedAt: string,
): Promise<void> {
  if (!score.isComplete || score.total === null || score.totalSeverity === null) {
    return;
  }

  const payload = {
    user_id: userId,
    instrument_id: score.instrumentId,
    checkin_id: checkinId,
    total_score: score.total,
    total_severity: score.totalSeverity,
    subscale_scores: score.subscales,
    item_responses: score.itemResponses,
    assessed_at: assessedAt,
  };

  const { error } = await supabase.from('assessment_results').insert(payload);
  if (error) {
    console.error('Failed to save assessment result:', error.message);
  }
}

export function buildAssessmentScore(
  mrsScores: Record<string, number | null | undefined>,
  instrumentId: string,
  checkinDate: string,
): InstrumentScore | null {
  const instrument = getInstrumentById(instrumentId);
  if (!instrument) return null;
  return calculateInstrumentScore(mrsScores, instrument, `${checkinDate}T12:00:00.000Z`);
}
