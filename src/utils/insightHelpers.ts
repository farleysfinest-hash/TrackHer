import type { Insight, InsightCategory, InsightPriority } from '../engine/types';

export type InsightFilterGroup = 'all' | 'correlations' | 'patterns' | 'trends' | 'labs' | 'positive';

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

/** Remove insights the user has dismissed. Static ids (e.g. trend-overall-improving) stay hidden until regeneration-on-material-change is implemented in a future AI layer. */
export function filterDismissedInsights(
  insights: Insight[],
  dismissedIds: ReadonlySet<string> | string[],
): Insight[] {
  const dismissed = dismissedIds instanceof Set ? dismissedIds : new Set(dismissedIds);
  return insights.filter((insight) => !dismissed.has(insight.id));
}
