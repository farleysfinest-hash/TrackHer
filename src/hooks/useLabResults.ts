import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { IS_DEV_MODE } from '../lib/devMode';
import { MOCK_USER } from '../lib/mockData';
import { getDevLabResults, setDevLabResults } from '../lib/devStore';
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

function buildDevLabResult(data: LabResultInput, id: string, userId: string): LabResult {
  const payload = buildLabPayload(data, userId);
  return {
    id,
    user_id: userId,
    draw_date: data.drawDate,
    fasting: data.fasting,
    draw_time: data.drawTime || null,
    lab_name: data.labName || null,
    notes: data.notes || null,
    estradiol: (payload.estradiol as number | null) ?? null,
    estrone: (payload.estrone as number | null) ?? null,
    progesterone: (payload.progesterone as number | null) ?? null,
    total_testosterone: (payload.total_testosterone as number | null) ?? null,
    free_testosterone: (payload.free_testosterone as number | null) ?? null,
    dhea_s: (payload.dhea_s as number | null) ?? null,
    shbg: (payload.shbg as number | null) ?? null,
    fsh: (payload.fsh as number | null) ?? null,
    lh: (payload.lh as number | null) ?? null,
    tsh: (payload.tsh as number | null) ?? null,
    free_t3: (payload.free_t3 as number | null) ?? null,
    free_t4: (payload.free_t4 as number | null) ?? null,
    cortisol_am: (payload.cortisol_am as number | null) ?? null,
    vitamin_d: (payload.vitamin_d as number | null) ?? null,
    ferritin: (payload.ferritin as number | null) ?? null,
    fasting_insulin: (payload.fasting_insulin as number | null) ?? null,
    hba1c: (payload.hba1c as number | null) ?? null,
    hs_crp: (payload.hs_crp as number | null) ?? null,
    homocysteine: (payload.homocysteine as number | null) ?? null,
    prolactin: (payload.prolactin as number | null) ?? null,
    igf1: (payload.igf1 as number | null) ?? null,
    total_cholesterol: (payload.total_cholesterol as number | null) ?? null,
    ldl: (payload.ldl as number | null) ?? null,
    hdl: (payload.hdl as number | null) ?? null,
    triglycerides: (payload.triglycerides as number | null) ?? null,
    created_at: new Date().toISOString(),
  };
}

export function useLabResults() {
  const [labResults, setLabResultsState] = useState<LabResult[]>(
    IS_DEV_MODE ? [...getDevLabResults()] : [],
  );
  const [isLoading, setIsLoading] = useState(!IS_DEV_MODE);
  const [error, setError] = useState<string | null>(null);

  const getUserId = () => useAuthStore.getState().user?.id;

  const syncDevLabs = useCallback(() => {
    const sorted = [...getDevLabResults()].sort((a, b) =>
      b.draw_date.localeCompare(a.draw_date),
    );
    setLabResultsState(sorted);
    setIsLoading(false);
  }, []);

  const fetchLabResults = useCallback(async () => {
    if (IS_DEV_MODE) {
      syncDevLabs();
      return;
    }

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
  }, [syncDevLabs]);

  const fetchLabDetail = async (id: string): Promise<LabResult | null> => {
    if (IS_DEV_MODE) {
      return getDevLabResults().find((l) => l.id === id) ?? null;
    }

    const { data, error: fetchError } = await supabase
      .from('lab_results')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !data) return null;
    return data as LabResult;
  };

  const getMostRecentLab = async (): Promise<LabResult | null> => {
    if (IS_DEV_MODE) {
      const sorted = [...getDevLabResults()].sort((a, b) =>
        b.draw_date.localeCompare(a.draw_date),
      );
      return sorted[0] ?? null;
    }

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

    if (IS_DEV_MODE) {
      const id = `lab-dev-${Date.now()}`;
      const newLab = buildDevLabResult(data, id, MOCK_USER.id);
      setDevLabResults([newLab, ...getDevLabResults()]);
      syncDevLabs();
      console.log('[DEV] Lab results saved:', newLab);
      return newLab;
    }

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

    if (IS_DEV_MODE) {
      const existing = getDevLabResults().find((l) => l.id === id);
      if (!existing) return false;
      const updated = buildDevLabResult(data, id, MOCK_USER.id);
      updated.created_at = existing.created_at;
      setDevLabResults(getDevLabResults().map((l) => (l.id === id ? updated : l)));
      syncDevLabs();
      console.log('[DEV] Lab results updated:', updated);
      return true;
    }

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
    if (IS_DEV_MODE) {
      setDevLabResults(getDevLabResults().filter((l) => l.id !== id));
      syncDevLabs();
      console.log('[DEV] Lab results deleted:', id);
      return true;
    }

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
