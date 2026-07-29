import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AiFactsPacket } from '../utils/aiFactsPacket';
import { clampVisitPrepPack, type VisitPrepPack } from '../utils/aiVisitPrep';
import type { JournalExtractResult } from '../utils/aiJournalExtract';
import { clampDoseWatchPack, type DoseWatchPack } from '../utils/aiDoseWatch';
import { clampVisitDebriefPack, type VisitDebriefPack } from '../utils/aiVisitDebrief';

export type AiChatTurn = { role: 'user' | 'assistant'; content: string };

export type AiAction =
  | 'chat'
  | 'improve_insights'
  | 'monitor'
  | 'report_narrative'
  | 'symptom_translate'
  | 'explain_insight'
  | 'visit_prep'
  | 'journal_extract'
  | 'dose_watch'
  | 'visit_debrief'
  | 'daily_line'
  | 'stage_explain';

interface ChatResult {
  reply: string;
  model?: string;
}

export interface PolishedInsight {
  id: string;
  title: string;
  body: string;
}

export interface AiCandidate {
  title: string;
  body: string;
  citedFacts: string[];
}

export interface ImproveInsightsResult {
  polished: PolishedInsight[];
  candidates: AiCandidate[];
  model?: string;
}

export interface MonitorResult {
  note: string;
  gapHint: string | null;
  model?: string;
}

export interface NarrativeResult {
  narrative: string;
  model?: string;
}

export interface SymptomSuggestion {
  key: string;
  label: string;
  reason: string;
}

export interface TranslateResult {
  suggestions: SymptomSuggestion[];
  model?: string;
}

async function invokeAiAssistant<T>(
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error: fnError } = await supabase.functions.invoke('ai-assistant', { body });
    if (fnError) {
      return { data: null, error: fnError.message || 'Could not reach the assistant' };
    }
    if (data?.error) {
      return {
        data: null,
        error: typeof data.error === 'string' ? data.error : 'Assistant error',
      };
    }
    return { data: data as T, error: null };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : 'Assistant request failed',
    };
  }
}

/** Non-hook invokers for stores / report generation / background jobs. */
export async function invokeImproveInsights(
  facts: AiFactsPacket,
): Promise<ImproveInsightsResult | null> {
  const { data, error } = await invokeAiAssistant<ImproveInsightsResult>({
    action: 'improve_insights',
    facts,
  });
  if (error || !data) return null;
  return {
    polished: Array.isArray(data.polished) ? data.polished : [],
    candidates: Array.isArray(data.candidates) ? data.candidates : [],
    model: data.model,
  };
}

export async function invokeMonitor(facts: AiFactsPacket): Promise<MonitorResult | null> {
  const { data, error } = await invokeAiAssistant<MonitorResult>({
    action: 'monitor',
    facts,
  });
  if (error || !data || typeof data.note !== 'string') return null;
  return {
    note: data.note,
    gapHint: typeof data.gapHint === 'string' ? data.gapHint : null,
    model: data.model,
  };
}

export async function invokeReportNarrative(
  facts: AiFactsPacket,
): Promise<NarrativeResult | null> {
  const { data, error } = await invokeAiAssistant<NarrativeResult>({
    action: 'report_narrative',
    facts,
  });
  if (error || !data || typeof data.narrative !== 'string') return null;
  return { narrative: data.narrative, model: data.model };
}

export async function invokeSymptomTranslate(
  freeText: string,
  catalog: Array<{ key: string; label: string; searchTerms?: string[] }>,
): Promise<TranslateResult | null> {
  const { data, error } = await invokeAiAssistant<TranslateResult>({
    action: 'symptom_translate',
    freeText,
    catalog,
  });
  if (error || !data) return null;
  return {
    suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
    model: data.model,
  };
}

export async function invokeExplainInsight(
  facts: AiFactsPacket,
  insight: { id?: string; title?: string; body?: string; category?: string },
): Promise<ChatResult | null> {
  const { data, error } = await invokeAiAssistant<ChatResult>({
    action: 'explain_insight',
    facts,
    insight,
  });
  if (error || !data || typeof data.reply !== 'string') return null;
  return { reply: data.reply, model: data.model };
}

export async function invokeVisitPrep(
  facts: AiFactsPacket,
  history?: AiChatTurn[],
): Promise<VisitPrepPack | null> {
  const { data, error } = await invokeAiAssistant<VisitPrepPack>({
    action: 'visit_prep',
    facts,
    history,
  });
  if (error || !data) return null;
  return clampVisitPrepPack(data);
}

export async function invokeJournalExtract(
  freeText: string,
  catalog: Array<{ key: string; label: string; searchTerms?: string[] }>,
  medications: string[],
): Promise<JournalExtractResult | null> {
  const { data, error } = await invokeAiAssistant<JournalExtractResult>({
    action: 'journal_extract',
    freeText,
    catalog,
    medications,
  });
  if (error || !data) return null;
  return {
    symptoms: Array.isArray(data.symptoms) ? data.symptoms : [],
    events: Array.isArray(data.events) ? data.events : [],
  };
}

export async function invokeDoseWatch(facts: AiFactsPacket): Promise<DoseWatchPack | null> {
  const { data, error } = await invokeAiAssistant<DoseWatchPack>({
    action: 'dose_watch',
    facts,
  });
  if (error || !data) return null;
  return clampDoseWatchPack(data);
}

export async function invokeVisitDebrief(
  freeText: string,
  facts: AiFactsPacket,
): Promise<VisitDebriefPack | null> {
  const { data, error } = await invokeAiAssistant<VisitDebriefPack>({
    action: 'visit_debrief',
    freeText,
    facts,
  });
  if (error || !data) return null;
  return clampVisitDebriefPack(data);
}

export async function invokeDailyLine(facts: AiFactsPacket): Promise<string | null> {
  const { data, error } = await invokeAiAssistant<{ line?: string; reply?: string }>({
    action: 'daily_line',
    facts,
  });
  if (error || !data) return null;
  if (typeof data.line === 'string') return data.line;
  if (typeof data.reply === 'string') return data.reply;
  return null;
}

export async function invokeStageExplain(facts: AiFactsPacket): Promise<string | null> {
  const { data, error } = await invokeAiAssistant<{ text?: string; reply?: string }>({
    action: 'stage_explain',
    facts,
  });
  if (error || !data) return null;
  if (typeof data.text === 'string') return data.text;
  if (typeof data.reply === 'string') return data.reply;
  return null;
}

export function useAiAssistant() {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(
    async (
      message: string,
      facts: AiFactsPacket,
      history: AiChatTurn[],
    ): Promise<ChatResult | null> => {
      setIsSending(true);
      setError(null);
      const { data, error: err } = await invokeAiAssistant<ChatResult>({
        action: 'chat',
        message,
        facts,
        history,
      });
      setIsSending(false);
      if (err) {
        setError(err);
        return null;
      }
      if (!data?.reply || typeof data.reply !== 'string') {
        setError('Empty reply from assistant');
        return null;
      }
      return { reply: data.reply, model: data.model };
    },
    [],
  );

  const explain = useCallback(
    async (
      facts: AiFactsPacket,
      insight: { id?: string; title?: string; body?: string; category?: string },
    ): Promise<ChatResult | null> => {
      setIsSending(true);
      setError(null);
      const result = await invokeExplainInsight(facts, insight);
      setIsSending(false);
      if (!result) {
        setError('Could not explain this insight');
        return null;
      }
      return result;
    },
    [],
  );

  return {
    ask,
    explain,
    isSending,
    error,
    clearError: () => setError(null),
  };
}
