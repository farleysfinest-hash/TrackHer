export const AI_RATE_LIMIT_CAPACITY = 45;
export const AI_RATE_LIMIT_HIGH_CEILING_CAPACITY = 120;
export const AI_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const ACTION_COSTS: Record<string, number> = {
  chat: 1,
  symptom_translate: 1,
  summarize_thread: 1,
  stage_explain: 1,
  explain_insight: 1,
  monitor: 2,
  report_narrative: 2,
  visit_prep: 2,
  journal_extract: 2,
  dose_watch: 2,
  visit_debrief: 2,
  partner_letter: 2,
  improve_insights: 3,
  lab_report_extract: 4,
};

export function aiActionCost(action: string): number | null {
  return ACTION_COSTS[action] ?? null;
}

export interface SharedRateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
  remainingUnits: number;
}

export function parseSharedRateLimitDecision(data: unknown): SharedRateLimitDecision | null {
  const candidate = Array.isArray(data) ? data[0] : data;
  if (!candidate || typeof candidate !== 'object') return null;
  const row = candidate as Record<string, unknown>;
  if (
    typeof row.allowed !== 'boolean' ||
    typeof row.retry_after_seconds !== 'number' ||
    typeof row.remaining_units !== 'number'
  ) {
    return null;
  }
  return {
    allowed: row.allowed,
    retryAfterSeconds: Math.max(0, Math.ceil(row.retry_after_seconds)),
    remainingUnits: Math.max(0, Math.floor(row.remaining_units)),
  };
}
