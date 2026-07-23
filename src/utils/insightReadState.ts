import type { Insight } from '../engine/types';
import { getUiValue, setUiValue } from '../lib/uiState';

const UI_STATE_KEY = 'viewed_insights';

interface ViewedInsightRecord {
  /** First 8 chars of a simple hash of title+body, for change detection. */
  hash: string;
  viewedAt: string;
}

function contentHash(title: string, body: string): string {
  let h = 0;
  const s = title + '\0' + body;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36).padStart(6, '0').slice(0, 8);
}

function migrateLegacy(raw: Record<string, unknown>): Record<string, ViewedInsightRecord> {
  const result: Record<string, ViewedInsightRecord> = {};
  for (const [id, val] of Object.entries(raw)) {
    if (val && typeof val === 'object' && 'title' in val && 'body' in val) {
      const legacy = val as { title: string; body: string; viewedAt: string };
      result[id] = {
        hash: contentHash(legacy.title, legacy.body),
        viewedAt: legacy.viewedAt,
      };
    } else if (val && typeof val === 'object' && 'hash' in val) {
      result[id] = val as ViewedInsightRecord;
    }
  }
  return result;
}

function loadViewed(): Record<string, ViewedInsightRecord> {
  const raw = getUiValue<Record<string, unknown>>(UI_STATE_KEY) ?? {};
  return migrateLegacy(raw);
}

export function markInsightAsViewed(insight: Insight): void {
  const viewed = { ...loadViewed() };
  const hash = contentHash(insight.title, insight.body);
  const existing = viewed[insight.id];
  // Idempotent: same content already recorded — do not bump viewedAt or
  // re-persist. Re-firing would thrash merge_ui_state and (if mirrored) the
  // auth store → useInsights → new Insight identities → this effect again.
  if (existing && existing.hash === hash) {
    return;
  }
  viewed[insight.id] = { hash, viewedAt: new Date().toISOString() };
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
  return contentHash(previous.title, previous.body) !== contentHash(next.title, next.body);
}
