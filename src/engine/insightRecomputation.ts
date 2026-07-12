import type { SymptomCheckin } from '../types/database';
import { formatEventDateShort } from '../utils/localDate';
import {
  hasInsightBeenViewed,
  insightContentChanged,
} from '../utils/insightReadState';
import type { Insight, PatternEngineResult } from './types';

function latestBackdatedEventDate(checkins: SymptomCheckin[]): string | null {
  const backdated = checkins.filter((c) => c.is_backdated);
  if (backdated.length === 0) return null;
  return [...backdated].sort((a, b) => b.checkin_date.localeCompare(a.checkin_date))[0]
    .checkin_date;
}

function buildUpdateNotice(backdateDate: string): string {
  return `This has been updated with a check-in you added for ${formatEventDateShort(backdateDate)}.`;
}

function applyUpdateNotice(insight: Insight, notice: string): Insight {
  if (insight.body.startsWith(notice)) return insight;
  return {
    ...insight,
    updateNotice: notice,
    body: `${notice} ${insight.body}`,
  };
}

function maybeMarkUpdated(
  insight: Insight,
  previousById: Map<string, Insight>,
  backdateDate: string | null,
): Insight {
  if (!backdateDate || !hasInsightBeenViewed(insight.id)) return insight;
  const previous = previousById.get(insight.id);
  if (!previous || !insightContentChanged(previous, insight)) return insight;
  return applyUpdateNotice(insight, buildUpdateNotice(backdateDate));
}

function mapInsights(
  insights: Insight[],
  previousById: Map<string, Insight>,
  backdateDate: string | null,
): Insight[] {
  return insights.map((i) => maybeMarkUpdated(i, previousById, backdateDate));
}

/**
 * When backdated data shifts an insight the user already read, prepend an honest update line.
 */
export function applyInsightRecomputationNotices(
  result: PatternEngineResult,
  previous: PatternEngineResult | null,
  checkins: SymptomCheckin[],
): PatternEngineResult {
  if (!previous) return result;

  const backdateDate = latestBackdatedEventDate(checkins);
  if (!backdateDate) return result;

  const previousById = new Map(previous.all.map((i) => [i.id, i]));

  return {
    primary: mapInsights(result.primary, previousById, backdateDate),
    more: mapInsights(result.more, previousById, backdateDate),
    all: mapInsights(result.all, previousById, backdateDate),
  };
}
