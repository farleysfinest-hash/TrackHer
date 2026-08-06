/** Visit debrief — client clamp matching Edge visit_debrief. */

export type VisitDebriefRiskTier =
  | 'crisis'
  | 'crisis_imminent'
  | 'loved_one';

export interface VisitDebriefFollowUp {
  label: string;
  timeframe: string | null;
  done?: boolean;
}

export interface VisitDebriefPack {
  planSummary: string;
  followUps: VisitDebriefFollowUp[];
  savedAt?: string;
  risk?: VisitDebriefRiskTier | null;
  riskReply?: string | null;
}

export const VISIT_DEBRIEF_STORAGE_KEY = 'trackher.visitDebrief.v1';

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'to',
  'of',
  'in',
  'on',
  'for',
  'with',
  'your',
  'any',
  'as',
  'if',
  'at',
  'be',
  'is',
  'are',
  'was',
  'were',
]);

function contentWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Drop checklist rows that only restate the plan summary
 * (e.g. "Monitor mood and energy" when the summary already says to track mood and energy).
 */
export function isFollowUpRedundantWithSummary(label: string, planSummary: string): boolean {
  const labelWords = contentWords(label);
  if (labelWords.length < 2) return false;
  const summarySet = new Set(contentWords(planSummary));
  if (summarySet.size === 0) return false;
  const hits = labelWords.filter((w) => summarySet.has(w)).length;
  return hits / labelWords.length >= 0.6;
}

export function clampVisitDebriefPack(raw: unknown): VisitDebriefPack | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const risk =
    o.risk === 'crisis' ||
    o.risk === 'crisis_imminent' ||
    o.risk === 'loved_one'
      ? o.risk
      : null;
  const riskReply =
    typeof o.riskReply === 'string' && o.riskReply.trim()
      ? o.riskReply.trim().slice(0, 2000)
      : null;

  if (risk && riskReply && !String(o.planSummary ?? '').trim()) {
    return {
      planSummary: '',
      followUps: [],
      risk,
      riskReply,
      savedAt: typeof o.savedAt === 'string' ? o.savedAt : undefined,
    };
  }

  const planSummary =
    typeof o.planSummary === 'string' ? o.planSummary.trim().slice(0, 1200) : '';
  if (!planSummary) return null;
  const followUps = Array.isArray(o.followUps)
    ? o.followUps
        .filter(
          (f): f is { label?: unknown; timeframe?: unknown; done?: unknown } =>
            !!f && typeof f === 'object',
        )
        .map((f): VisitDebriefFollowUp | null => {
          const label =
            typeof f.label === 'string' && f.label.trim()
              ? f.label.trim().slice(0, 200)
              : '';
          if (!label) return null;
          const timeframe =
            typeof f.timeframe === 'string' && f.timeframe.trim()
              ? f.timeframe.trim().slice(0, 80)
              : null;
          return {
            label,
            timeframe,
            done: f.done === true,
          };
        })
        .filter((f): f is VisitDebriefFollowUp => f !== null)
        .filter((f) => !isFollowUpRedundantWithSummary(f.label, planSummary))
        .slice(0, 5)
    : [];
  return {
    planSummary,
    followUps,
    risk: risk && riskReply ? risk : null,
    riskReply: risk && riskReply ? riskReply : null,
    savedAt: typeof o.savedAt === 'string' ? o.savedAt : undefined,
  };
}

export function readVisitDebriefFromStorage(): VisitDebriefPack | null {
  try {
    const raw = localStorage.getItem(VISIT_DEBRIEF_STORAGE_KEY);
    if (!raw) return null;
    return clampVisitDebriefPack(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeVisitDebriefToStorage(pack: VisitDebriefPack): void {
  try {
    const clamped = clampVisitDebriefPack(pack);
    if (!clamped) return;
    localStorage.setItem(
      VISIT_DEBRIEF_STORAGE_KEY,
      JSON.stringify({ ...clamped, savedAt: pack.savedAt ?? new Date().toISOString() }),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function clearVisitDebriefStorage(): void {
  try {
    localStorage.removeItem(VISIT_DEBRIEF_STORAGE_KEY);
  } catch {
    // ignore
  }
}
