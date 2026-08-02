import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AiFactsPacket } from '../utils/aiFactsPacket';
import type { LunaCrisisState, LunaCrisisTier } from '../types/database';
import { clampVisitPrepPack, type VisitPrepPack } from '../utils/aiVisitPrep';
import type { JournalExtractResult } from '../utils/aiJournalExtract';
import { clampDoseWatchPack, type DoseWatchPack } from '../utils/aiDoseWatch';
import { clampVisitDebriefPack, type VisitDebriefPack } from '../utils/aiVisitDebrief';
import {
  clampLabReportExtraction,
  type LabReportExtractionDraft,
} from '../utils/labReportExtraction';

export type AiChatTurn = {
  role: 'user' | 'assistant';
  content: string;
  crisisTier?: string | null;
};

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
  | 'summarize_thread'
  | 'stage_explain'
  | 'partner_letter'
  | 'lab_report_extract';

export interface ChatResult {
  reply: string;
  model?: string;
  shape?: string;
  crisis?: {
    tier: string;
    responseCount: number;
    showSafetyPanel: boolean;
    expiresAt: string;
  };
  memoryProposal?: string | null;
  toolEvidence?: Array<Record<string, unknown>>;
}

function isLunaCrisisTier(value: string): value is Exclude<LunaCrisisTier, null> {
  return (
    value === 'mental_decline' ||
    value === 'crisis' ||
    value === 'crisis_imminent' ||
    value === 'loved_one'
  );
}

/** Immediate client state from the trusted Edge response; DB persistence is continuity only. */
export function localCrisisStateFromChatResult(
  userId: string,
  crisis: ChatResult['crisis'],
  now = new Date(),
): LunaCrisisState | null {
  if (!crisis || !isLunaCrisisTier(crisis.tier)) return null;
  return {
    user_id: userId,
    tier: crisis.tier,
    response_count: Math.max(1, Math.round(crisis.responseCount)),
    presented_actions: crisis.showSafetyPanel ? ['support_panel'] : [],
    asked_questions: [],
    escalated: false,
    last_activity_at: now.toISOString(),
    expires_at: crisis.expiresAt,
  };
}

export interface LunaChatOptions {
  threadId?: string;
  threadSummary?: string | null;
  memories?: string[];
  pageContext?: Record<string, unknown>;
  factsHash?: string;
}

export interface PolishedInsight {
  id: string;
  title: string;
  body: string;
}

export interface AiCandidate {
  candidateKey: string;
  evidenceClass: 'early_signal' | 'repeated_finding';
  title: string;
  body: string;
  citedFacts: string[];
  whyItMatters: string;
  limitations: string;
    strength: string;
  toolEvidence?: Record<string, unknown>;
}

export interface ImproveInsightsResult {
  polished: PolishedInsight[];
  candidates: AiCandidate[];
  insufficient?: { title: string; body: string } | null;
  monitorNote?: { note?: string; gapHint?: string | null } | null;
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
  factsHash?: string,
): Promise<ImproveInsightsResult | null> {
  const { data, error } = await invokeAiAssistant<ImproveInsightsResult>({
    action: 'improve_insights',
    facts,
    factsHash,
  });
  if (error || !data) return null;
  return {
    polished: Array.isArray(data.polished) ? data.polished : [],
    candidates: Array.isArray(data.candidates) ? data.candidates : [],
    insufficient:
      data.insufficient && typeof data.insufficient === 'object'
        ? data.insufficient
        : null,
    monitorNote:
      data.monitorNote && typeof data.monitorNote === 'object' ? data.monitorNote : null,
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
  return data;
}

export async function invokeDoseWatch(
  facts: AiFactsPacket,
  doseChange?: { medicationName: string; changeDate: string; changeType?: string },
): Promise<DoseWatchPack | null> {
  const { data, error } = await invokeAiAssistant<DoseWatchPack>({
    action: 'dose_watch',
    facts,
    doseChange,
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

export interface PartnerLetterResult {
  letter: string | null;
  riskReply: string | null;
}

export async function invokePartnerLetter(
  facts: AiFactsPacket,
  freeText?: string,
): Promise<PartnerLetterResult | null> {
  const { data, error } = await invokeAiAssistant<{
    letter?: string;
    reply?: string;
    riskReply?: string;
  }>({
    action: 'partner_letter',
    facts,
    freeText,
  });
  if (error || !data) return null;
  if (typeof data.riskReply === 'string' && data.riskReply.trim()) {
    return { letter: null, riskReply: data.riskReply.trim().slice(0, 2000) };
  }
  const letter =
    typeof data.letter === 'string' && data.letter
      ? data.letter
      : typeof data.reply === 'string'
        ? data.reply
        : null;
  return letter === null ? null : { letter, riskReply: null };
}

export async function invokeLabReportExtraction(input: {
  fileName: string;
  mimeType: string;
  dataUrl: string;
  knownMedications: string[];
}): Promise<LabReportExtractionDraft | null> {
  // Mirror of the Edge-side cap; keeps oversized payloads off the wire entirely.
  if (input.dataUrl.length > 12_000_000) return null;
  const { data, error } = await invokeAiAssistant<unknown>({
    action: 'lab_report_extract',
    report: {
      fileName: input.fileName.slice(0, 180),
      mimeType: input.mimeType,
      dataUrl: input.dataUrl,
    },
    medications: input.knownMedications.slice(0, 100),
  });
  if (error || !data) return null;
  return clampLabReportExtraction(data);
}

export async function invokeThreadSummary(
  existingSummary: string | null,
  messages: AiChatTurn[],
): Promise<string | null> {
  const { data, error } = await invokeAiAssistant<{ summary?: string }>({
    action: 'summarize_thread',
    existingSummary,
    messages,
  });
  if (error || !data || typeof data.summary !== 'string') return null;
  const summary = data.summary.trim();
  return summary ? summary.slice(0, 5000) : null;
}

export function useAiAssistant() {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);

  const ask = useCallback(
    async (
      message: string,
      facts: AiFactsPacket,
      history: AiChatTurn[],
      options?: LunaChatOptions,
    ): Promise<ChatResult | null> => {
      setIsSending(true);
      setError(null);
      const { data, error: err } = await invokeAiAssistant<ChatResult>({
        action: 'chat',
        message,
        facts,
        history,
        threadId: options?.threadId,
        threadSummary: options?.threadSummary,
        memories: options?.memories,
        pageContext: options?.pageContext,
        factsHash: options?.factsHash,
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
      return data;
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
    clearError,
  };
}
