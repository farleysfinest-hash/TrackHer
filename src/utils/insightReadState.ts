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
  viewed[insight.id] = {
    title: insight.title,
    body: insight.body,
    viewedAt: new Date().toISOString(),
  };
  setUiValue(UI_STATE_KEY, viewed);
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
