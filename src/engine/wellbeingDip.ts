import type { Insight } from './types';
import { finalizeInsightBody, INSIGHT_DISCLAIMER } from './types';
import { addDaysISO } from '../utils/localDate';
import { confidenceFromBeforeAfter } from './confidence';
import {
  type WellbeingSignalInput,
  dailySignalSeries,
  daysBetween,
  mean,
} from './wellbeingShared';

export function dipTripwire(input: WellbeingSignalInput, suppress: boolean): Insight[] {
  if (suppress) return [];
  const points = dailySignalSeries(input.checkins);
  if (points.length < 8) return [];

  const today = points[points.length - 1].date;
  const start30 = addDaysISO(today, -30);
  const last30 = points.filter((p) => p.date >= start30);
  if (last30.length < 8) return [];

  const avg30 = mean(last30.map((p) => p.value));
  if (avg30 === null) return [];

  const recent4: typeof points = [];
  for (let i = points.length - 1; i >= 0 && recent4.length < 4; i--) {
    if (recent4.length === 0) {
      recent4.push(points[i]);
      continue;
    }
    const prev = recent4[recent4.length - 1];
    const cur = points[i];
    const gap = daysBetween(cur.date, prev.date);
    if (gap > 2) break;
    recent4.push(cur);
  }
  if (recent4.length < 4) return [];
  recent4.reverse();

  const allLow = recent4.every((p) => p.value <= avg30 - 1);
  if (!allLow) return [];

  const latestDate = recent4[recent4.length - 1].date;

  return [
    {
      id: `wb-dip-${latestDate}`,
      category: 'observation',
      priority: 'low',
      title: 'Rougher few days than your usual',
      body: finalizeInsightBody(
        `Your last four daily pulses have run well below your recent average. If it feels right, a full check-in now would capture what's happening while it's fresh — useful detail for spotting what changed.`,
        { n: recent4.length },
        false,
      ),
      sampleSize: { n: recent4.length },
      confidence: confidenceFromBeforeAfter(
        last30.map((p) => p.value),
        recent4.map((p) => p.value),
        avg30 - mean(recent4.map((p) => p.value))!,
        30,
        4,
        { n: recent4.length },
      ),
      supportingData: {},
      actionSuggestion: undefined,
      disclaimer: INSIGHT_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    },
  ];
}
