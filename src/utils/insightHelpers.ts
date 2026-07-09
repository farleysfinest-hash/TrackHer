import type { Insight, InsightCategory, InsightPriority } from '../engine/types';

export type InsightFilterGroup = 'all' | 'correlations' | 'patterns' | 'trends' | 'labs' | 'positive';

export interface DismissalRecord {
  insight_id: string;
  dismissed_at: string;
}

const DISMISSAL_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

const OBSERVATION_PREFIXES = ['obs-baseline', 'obs-delta', 'obs-dominant', 'obs-steady'] as const;

function getObservationTypePrefix(insightId: string): string | null {
  if (!insightId.startsWith('obs-')) return null;
  return OBSERVATION_PREFIXES.find((prefix) => insightId.startsWith(prefix)) ?? null;
}

function isDismissalExpired(dismissedAt: string, now = Date.now()): boolean {
  return now - new Date(dismissedAt).getTime() > DISMISSAL_EXPIRY_MS;
}

function shouldSuppressInsight(insight: Insight, dismissals: DismissalRecord[], now: number): boolean {
  const obsPrefix = getObservationTypePrefix(insight.id);
  if (obsPrefix) {
    return dismissals.some((d) => {
      const dPrefix = getObservationTypePrefix(d.insight_id);
      return dPrefix === obsPrefix && !isDismissalExpired(d.dismissed_at, now);
    });
  }

  const dismissal = dismissals.find((d) => d.insight_id === insight.id);
  if (!dismissal) return false;

  if (insight.category === 'trend_alert') {
    return !isDismissalExpired(dismissal.dismissed_at, now);
  }

  return true;
}

export const INSIGHT_FILTER_OPTIONS: Array<{ key: InsightFilterGroup; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'correlations', label: 'Correlations' },
  { key: 'patterns', label: 'Patterns' },
  { key: 'trends', label: 'Trends' },
  { key: 'labs', label: 'Lab' },
  { key: 'positive', label: 'Positive' },
];

const FILTER_GROUPS: Record<InsightFilterGroup, InsightCategory[] | null> = {
  all: null,
  correlations: ['dose_correlation'],
  patterns: ['symptom_cluster'],
  trends: ['trend_alert', 'new_symptom', 'medication_note'],
  labs: ['lab_discordance', 'lab_due'],
  positive: ['positive_trend'],
};

export function filterInsightsByGroup(
  insights: Insight[],
  group: InsightFilterGroup,
): Insight[] {
  const categories = FILTER_GROUPS[group];
  if (!categories) return insights;
  return insights.filter((i) => categories.includes(i.category));
}

export function getPriorityLabel(priority: InsightPriority): string {
  switch (priority) {
    case 'high':
      return 'Needs Attention';
    case 'medium':
      return 'Worth Reviewing';
    case 'positive':
      return 'Good News';
    case 'low':
      return 'For Your Reference';
  }
}

export function getPriorityBadgeVariant(
  priority: InsightPriority,
): 'danger' | 'warning' | 'success' | 'neutral' {
  switch (priority) {
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    case 'positive':
      return 'success';
    case 'low':
      return 'neutral';
  }
}

export function getCategoryLabel(category: InsightCategory): string {
  switch (category) {
    case 'dose_correlation':
      return 'Dose Correlation';
    case 'symptom_cluster':
      return 'Symptom Pattern';
    case 'lab_discordance':
      return 'Lab Discordance';
    case 'trend_alert':
      return 'Trend Alert';
    case 'positive_trend':
      return 'Positive Trend';
    case 'new_symptom':
      return 'New Symptom';
    case 'medication_note':
      return 'Medication Note';
    case 'lab_due':
      return 'Lab Reminder';
    case 'observation':
      return 'Observation';
  }
}

export function sortInsightsByPriority(insights: Insight[]): Insight[] {
  const order: Record<InsightPriority, number> = {
    high: 0,
    medium: 1,
    positive: 2,
    low: 3,
  };
  return [...insights].sort((a, b) => order[a.priority] - order[b.priority]);
}

/** Remove insights the user has dismissed. trend_alert and obs-* dismissals expire after 30 days. */
export function filterDismissedInsights(
  insights: Insight[],
  dismissals: DismissalRecord[] | ReadonlySet<string> | string[],
): Insight[] {
  const now = Date.now();
  let records: DismissalRecord[];

  if (dismissals instanceof Set) {
    records = [...dismissals].map((insight_id) => ({
      insight_id,
      dismissed_at: new Date(now).toISOString(),
    }));
  } else if (
    Array.isArray(dismissals) &&
    dismissals.length > 0 &&
    typeof dismissals[0] === 'string'
  ) {
    records = (dismissals as string[]).map((insight_id) => ({
      insight_id,
      dismissed_at: new Date(now).toISOString(),
    }));
  } else {
    records = dismissals as DismissalRecord[];
  }

  return insights.filter((insight) => !shouldSuppressInsight(insight, records, now));
}
