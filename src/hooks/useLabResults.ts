import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { LabResult } from '../types/database';
import { BIOMARKER_KEYS, getBiomarkerValue } from '../utils/labHelpers';

export interface LabResultInput {
  drawDate: string;
  fasting: boolean | null;
  drawTime: string | null;
  labName: string;
  values: Record<string, number | null>;
  notes: string;
}

function buildLabPayload(data: LabResultInput, userId: string) {
  const payload: Record<string, unknown> = {
    user_id: userId,
    draw_date: data.drawDate,
    fasting: data.fasting,
    draw_time: data.drawTime || null,
    lab_name: data.labName || null,
    notes: data.notes || null,
  };

  for (const key of BIOMARKER_KEYS) {
    payload[key] = data.values[key] ?? null;
  }

  return payload;
}

export function useLabResults() {
  const [labResults, setLabResultsState] = useState<LabResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getUserId = () => useAuthStore.getState().user?.id;

  const fetchLabResults = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('lab_results')
      .select('*')
      .eq('user_id', userId)
      .order('draw_date', { ascending: false });

    setIsLoading(false);
    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setLabResultsState((data as LabResult[]) ?? []);
  }, []);

  const fetchLabDetail = async (id: string): Promise<LabResult | null> => {
    const { data, error: fetchError } = await supabase
      .from('lab_results')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !data) return null;
    return data as LabResult;
  };

  const getMostRecentLab = async (): Promise<LabResult | null> => {
    const userId = getUserId();
    if (!userId) return null;

    const { data } = await supabase
      .from('lab_results')
      .select('*')
      .eq('user_id', userId)
      .order('draw_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ? (data as LabResult) : null;
  };

  const createLabResult = async (data: LabResultInput): Promise<LabResult | null> => {
    const userId = getUserId();
    if (!userId) return null;

    const payload = buildLabPayload(data, userId);
    const { data: inserted, error: insertError } = await supabase
      .from('lab_results')
      .insert(payload)
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      return null;
    }

    await fetchLabResults();
    return inserted as LabResult;
  };

  const updateLabResult = async (id: string, data: LabResultInput): Promise<boolean> => {
    const userId = getUserId();
    if (!userId) return false;

    const payload = buildLabPayload(data, userId);
    delete payload.user_id;

    const { error: updateError } = await supabase
      .from('lab_results')
      .update(payload)
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    await fetchLabResults();
    return true;
  };

  const deleteLabResult = async (id: string): Promise<boolean> => {
    const { error: deleteError } = await supabase.from('lab_results').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      return false;
    }
    await fetchLabResults();
    return true;
  };

  const getPreviousValue = useCallback(
    (biomarkerKey: string, currentDrawDate: string): number | null => {
      const olderLabs = labResults
        .filter((l) => l.draw_date < currentDrawDate)
        .sort((a, b) => b.draw_date.localeCompare(a.draw_date));
      if (olderLabs.length === 0) return null;
      return getBiomarkerValue(olderLabs[0], biomarkerKey);
    },
    [labResults],
  );

  return {
    labResults,
    isLoading,
    error,
    fetchLabResults,
    fetchLabDetail,
    getMostRecentLab,
    createLabResult,
    updateLabResult,
    deleteLabResult,
    getPreviousValue,
  };
}
