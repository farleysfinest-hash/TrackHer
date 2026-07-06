import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { IS_DEV_MODE } from '../lib/devMode';
import { useAuthStore } from '../stores/authStore';
import type { AssessmentResult, InstrumentScore, SeverityLevel } from '../types/instruments';

let devAssessments: AssessmentResult[] = [];

export function getDevAssessments(): AssessmentResult[] {
  return devAssessments;
}

export function setDevAssessments(results: AssessmentResult[]): void {
  devAssessments = results;
}

export function useAssessments() {
  const [assessments, setAssessments] = useState<AssessmentResult[]>(
    IS_DEV_MODE ? [...devAssessments] : [],
  );
  const [isLoading, setIsLoading] = useState(!IS_DEV_MODE);
  const [error, setError] = useState<string | null>(null);

  const getUserId = () => useAuthStore.getState().user?.id;

  const fetchAssessments = useCallback(
    async (instrumentId?: string, limit = 100) => {
      if (IS_DEV_MODE) {
        let results = [...devAssessments];
        if (instrumentId) {
          results = results.filter((a) => a.instrument_id === instrumentId);
        }
        results.sort((a, b) => b.assessed_at.localeCompare(a.assessed_at));
        setAssessments(results.slice(0, limit));
        setIsLoading(false);
        return;
      }

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

      if (IS_DEV_MODE) {
        const result: AssessmentResult = {
          id: `assessment-dev-${Date.now()}`,
          ...payload,
          created_at: new Date().toISOString(),
        };
        devAssessments = [result, ...devAssessments];
        setAssessments((prev) => [result, ...prev]);
        return result;
      }

      const { data, error: insertError } = await supabase
        .from('assessment_results')
        .insert(payload)
        .select()
        .single();

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
