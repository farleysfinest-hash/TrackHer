import type { Insight } from '../engine/types';

const STORAGE_KEY = 'trackher-viewed-insights';

interface ViewedInsightRecord {
  title: string;
  body: string;
  viewedAt: string;
}

function loadViewed(): Record<string, ViewedInsightRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, ViewedInsightRecord>;
  } catch {
    return {};
  }
}

function saveViewed(viewed: Record<string, ViewedInsightRecord>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(viewed));
  } catch {
    // ignore quota errors
  }
}

export function markInsightAsViewed(insight: Insight): void {
  const viewed = loadViewed();
  viewed[insight.id] = {
    title: insight.title,
    body: insight.body,
    viewedAt: new Date().toISOString(),
  };
  saveViewed(viewed);
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
