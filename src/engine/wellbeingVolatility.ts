import type { Insight } from './types';
import { finalizeInsightBody, INSIGHT_DISCLAIMER } from './types';
import { addDaysISO } from '../utils/localDate';
import { confidenceFromBeforeAfter } from './confidence';
import {
  type WellbeingSignalInput,
  VOLATILITY_LOOKBACK_DAYS,
  VOLATILITY_MIN_POINTS,
  VOLATILITY_THRESHOLD,
  MOOD_VOLATILITY_THRESHOLD,
  dailySignalSeries,
  moodSeries,
  daysBetween,
  mean,
  round1,
} from './wellbeingShared';

export function volatilityInsight(input: WellbeingSignalInput, suppress: boolean): Insight[] {
  if (suppress) return [];
  const points = dailySignalSeries(input.checkins);
  if (points.length < VOLATILITY_MIN_POINTS) return [];

  const today = points[points.length - 1].date;
  const start = addDaysISO(today, -VOLATILITY_LOOKBACK_DAYS);
  const recent = points.filter((p) => p.date >= start);
  if (recent.length < VOLATILITY_MIN_POINTS) return [];

  const swings: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1];
    const cur = recent[i];
    const gap = daysBetween(prev.date, cur.date);
    if (gap > 2) continue;
    swings.push(Math.abs(cur.value - prev.value));
  }
  if (swings.length < Math.max(6, Math.floor(VOLATILITY_MIN_POINTS / 2))) return [];

  const avgSwing = mean(swings);
  if (avgSwing === null || avgSwing < VOLATILITY_THRESHOLD) return [];

  const values = recent.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return [
    {
      id: 'wb-volatility',
      category: 'wellbeing_signal',
      priority: 'low',
      title: 'Your day-to-day energy swings widely',
      body: finalizeInsightBody(
        `Over the past three weeks your daily energy has moved an average of ${round1(
          avgSwing,
        ).toFixed(1)} points between consecutive logged days, ranging from ${min} to ${max}. Big day-to-day swings — rather than steadily low days — are a pattern many women notice during hormonal fluctuation.`,
        { n: recent.length },
        false,
      ),
      sampleSize: { n: recent.length },
      confidence: (() => {
        const mid = Math.floor(swings.length / 2);
        const earlySwings = swings.slice(0, mid);
        const lateSwings = swings.slice(mid);
        const earlyMean = mean(earlySwings) ?? 0;
        const lateMean = mean(lateSwings) ?? 0;
        return confidenceFromBeforeAfter(
          earlySwings,
          lateSwings,
          lateMean - earlyMean,
          VOLATILITY_LOOKBACK_DAYS,
          VOLATILITY_MIN_POINTS,
          { n: recent.length },
        );
      })(),
      supportingData: {},
      actionSuggestion:
        'Fluctuation patterns are worth showing your provider — they can point toward different adjustments than consistently low days do.',
      disclaimer: INSIGHT_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    },
  ];
}

export function moodVolatilityInsight(input: WellbeingSignalInput, suppress: boolean): Insight[] {
  if (suppress) return [];
  const points = moodSeries(input.checkins);
  if (points.length < VOLATILITY_MIN_POINTS) return [];

  const today = points[points.length - 1].date;
  const start = addDaysISO(today, -VOLATILITY_LOOKBACK_DAYS);
  const recent = points.filter((p) => p.date >= start);
  if (recent.length < VOLATILITY_MIN_POINTS) return [];

  const swings: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1];
    const cur = recent[i];
    const gap = daysBetween(prev.date, cur.date);
    if (gap > 2) continue;
    swings.push(Math.abs(cur.value - prev.value));
  }
  if (swings.length < Math.max(6, Math.floor(VOLATILITY_MIN_POINTS / 2))) return [];

  const avgSwing = mean(swings);
  if (avgSwing === null || avgSwing < MOOD_VOLATILITY_THRESHOLD) return [];

  const values = recent.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return [
    {
      id: 'wb-mood-volatility',
      category: 'wellbeing_signal',
      priority: 'low',
      title: 'Your mood swings widely day to day',
      body: finalizeInsightBody(
        `Over the past three weeks your mood has moved an average of ${round1(
          avgSwing,
        ).toFixed(1)} points between consecutive logged days, ranging from ${min} to ${max} on the 1–5 scale.`,
        { n: recent.length },
        false,
      ),
      sampleSize: { n: recent.length },
      confidence: (() => {
        const mid = Math.floor(swings.length / 2);
        const earlySwings = swings.slice(0, mid);
        const lateSwings = swings.slice(mid);
        const earlyMean = mean(earlySwings) ?? 0;
        const lateMean = mean(lateSwings) ?? 0;
        return confidenceFromBeforeAfter(
          earlySwings,
          lateSwings,
          lateMean - earlyMean,
          VOLATILITY_LOOKBACK_DAYS,
          VOLATILITY_MIN_POINTS,
          { n: recent.length },
        );
      })(),
      supportingData: {},
      actionSuggestion:
        'Mood fluctuation patterns are worth showing your provider — fluctuation (not just low mood) is characteristic of hormonal transition.',
      disclaimer: INSIGHT_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    },
  ];
}
