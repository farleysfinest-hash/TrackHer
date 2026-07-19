import type { Insight } from '../engine/types';
import { getUiValue, setUiValue } from '../lib/uiState';

const UI_STATE_KEY = 'viewed_insights';

interface ViewedInsightRecord {
  title: string;
  body: string;
  viewedAt: string;
}

function loadViewed(): Record<string, ViewedInsightRecord> {
  return getUiValue<Record<string, ViewedInsightRecord>>(UI_STATE_KEY) ?? {};
}

export function markInsightAsViewed(insight: Insight): void {
  const viewed = { ...loadViewed() };
  const existing = viewed[insight.id];
  // Idempotent: same title/body already recorded — do not bump viewedAt or
  // re-persist. Re-firing would thrash merge_ui_state and (if mirrored) the
  // auth store → useInsights → new Insight identities → this effect again.
  if (
    existing &&
    existing.title === insight.title &&
    existing.body === insight.body
  ) {
    return;
  }
  viewed[insight.id] = {
    title: insight.title,
    body: insight.body,
    viewedAt: new Date().toISOString(),
  };
  // Cache + RPC only. Mirroring into profile.ui_state would recreate every
  // Insight object and re-enter InsightCard's mark-as-viewed effect.
  setUiValue(UI_STATE_KEY, viewed, { mirrorToProfile: false });
}

export function getViewedInsightIds(): Set<string> {
  return new Set(Object.keys(loadViewed()));
}

export function hasInsightBeenViewed(insightId: string): boolean {
  return insightId in loadViewed();
}

export function insightContentChanged(previous: Insight, next: Insight): boolean {
  return previous.title !== next.title || previous.body !== next.body;
}
