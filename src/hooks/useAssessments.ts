import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { AssessmentResult, InstrumentScore, SeverityLevel } from '../types/instruments';

export function useAssessments() {
  const [assessments, setAssessments] = useState<AssessmentResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getUserId = () => useAuthStore.getState().user?.id;

  const fetchAssessments = useCallback(
    async (instrumentId?: string, limit = 100) => {
      const userId = getUserId();
      if (!userId) return;

      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('assessment_results')
        .select('*')
        .eq('user_id', userId)
        .order('assessed_at', { ascending: false })
        .limit(limit);

      if (instrumentId) {
        query = query.eq('instrument_id', instrumentId);
      }

      const { data, error: fetchError } = await query;

      setIsLoading(false);
      if (fetchError) {
        setError(fetchError.message);
        return;
      }
      setAssessments((data as AssessmentResult[]) ?? []);
    },
    [],
  );

  const saveAssessment = useCallback(
    async (
      score: InstrumentScore,
      checkinId?: string | null,
      assessedAt?: string,
    ): Promise<AssessmentResult | null> => {
      const userId = getUserId();
      if (!userId) return null;

      if (!score.isComplete || score.total === null) return null;

      const payload = {
        user_id: userId,
        instrument_id: score.instrumentId,
        checkin_id: checkinId ?? null,
        total_score: score.total,
        total_severity: score.totalSeverity as SeverityLevel,
        subscale_scores: score.subscales,
        item_responses: score.itemResponses,
        assessed_at: assessedAt ?? score.completedAt,
      };

      const { data, error: insertError } = await supabase
        .from('assessment_results')
        .insert(payload)
        .select()
        .maybeSingle();

      if (insertError) {
        setError(insertError.message);
        return null;
      }

      const created = data as AssessmentResult;
      setAssessments((prev) => [created, ...prev]);
      return created;
    },
    [],
  );

  return {
    assessments,
    isLoading,
    error,
    fetchAssessments,
    saveAssessment,
  };
}
