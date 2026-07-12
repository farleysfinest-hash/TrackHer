import type { Insight } from './types';
import { finalizeInsightBody, INSIGHT_DISCLAIMER } from './types';
import type { SymptomCheckin } from '../types/database';
import { MRS_INSTRUMENT } from '../data/instruments/mrs';
import { scoreInstrument, getItemStorageKey } from '../data/instruments/scoring';
import type { InstrumentScore } from '../types/instruments';
import {
  getMRSSeverityBand,
  hasMRSData,
  MRS_SUBSCALE_FRIENDLY_LABELS,
  MRS_TOTAL_MAX,
} from '../utils/checkinHelpers';
import { provisionalInsightConfidence } from './confidence';

interface EarlyObservationsInput {
  checkins: SymptomCheckin[];
}

const PROVISIONAL_OPENING =
  'Early days — this is what your first few check-ins show, not a pattern yet. Patterns need a few more weeks of logging before they mean anything.';

function provisionalBody(core: string): string {
  return `${PROVISIONAL_OPENING} ${core}`;
}

function scoreCheckin(checkin: SymptomCheckin): InstrumentScore {
  return scoreInstrument(
    checkin as unknown as Record<string, number | null>,
    MRS_INSTRUMENT,
    `${checkin.checkin_date}T12:00:00.000Z`,
  );
}

function topSubscaleLabel(score: InstrumentScore): string {
  const ranked = MRS_INSTRUMENT.subscales
    .map((sub) => ({
      id: sub.id,
      value: score.subscales[sub.id]?.score,
    }))
    .filter((entry): entry is { id: string; value: number } => entry.value != null)
    .sort((a, b) => b.value - a.value);
  const top = ranked[0];
  return MRS_SUBSCALE_FRIENDLY_LABELS[top.id] ?? top.id;
}

function sortedMrsCheckins(checkins: SymptomCheckin[]): SymptomCheckin[] {
  return [...checkins]
    .filter(hasMRSData)
    .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
}

function baselineObservation(checkin: SymptomCheckin): Insight {
  const score = scoreCheckin(checkin);
  if (!score.isComplete || score.total === null) {
    throw new Error('baselineObservation requires a complete MRS check-in');
  }
  const band = getMRSSeverityBand(score.total);
  const subscale = topSubscaleLabel(score);

  return {
    id: 'obs-baseline',
    category: 'observation',
    priority: 'low',
    title: `Your first check-in: ${band.bandLabel} symptom severity`,
    body: finalizeInsightBody(
      provisionalBody(
        `Your MRS total on this check-in was ${score.total} of ${MRS_TOTAL_MAX} — ${band.rangePhrase}. Your ${subscale} ratings were the highest on this check-in.`,
      ),
      { n: 1 },
      false,
    ),
    sampleSize: { n: 1 },
    confidence: provisionalInsightConfidence(),
    actionSuggestion:
      "Scores of 9+ are generally considered clinically relevant — worth bringing to your provider if you haven't already.",
    supportingData: {
      trendData: [{ date: checkin.checkin_date, score: score.total }],
    },
    disclaimer: INSIGHT_DISCLAIMER,
    generatedAt: new Date().toISOString(),
  };
}

function largestSymptomShift(
  previous: SymptomCheckin,
  latest: SymptomCheckin,
): { label: string; before: number; after: number } | null {
  let best: { label: string; before: number; after: number; delta: number } | null = null;

  for (const item of MRS_INSTRUMENT.items) {
    const key = getItemStorageKey(item);
    const before = previous[key as keyof SymptomCheckin] as number | null;
    const after = latest[key as keyof SymptomCheckin] as number | null;
    if (before === null || after === null) continue;
    const delta = Math.abs(after - before);
    if (!best || delta > best.delta) {
      best = { label: item.label, before, after, delta };
    }
  }

  return best && best.delta > 0 ? best : null;
}

function pairObservation(previous: SymptomCheckin, latest: SymptomCheckin): Insight {
  const prevScore = scoreCheckin(previous);
  const latestScore = scoreCheckin(latest);
  if (
    !prevScore.isComplete ||
    !latestScore.isComplete ||
    prevScore.total === null ||
    latestScore.total === null
  ) {
    throw new Error('pairObservation requires complete MRS check-ins');
  }
  const pairSample = { n: 2 };
  const symptomShift = largestSymptomShift(previous, latest);
  const symptomSentence = symptomShift
    ? ` On individual items, ${symptomShift.label.toLowerCase()} was ${symptomShift.before} on your prior check-in and ${symptomShift.after} on your latest.`
    : '';

  return {
    id: `obs-pair-${latest.checkin_date}`,
    category: 'observation',
    priority: 'low',
    title: 'Your last two check-ins',
    body: finalizeInsightBody(
      provisionalBody(
        `Your MRS total was ${prevScore.total} of ${MRS_TOTAL_MAX} on your prior check-in and ${latestScore.total} on your latest.${symptomSentence}`,
      ),
      pairSample,
      false,
    ),
    sampleSize: pairSample,
    confidence: provisionalInsightConfidence(),
    supportingData: {
      trendData: [
        { date: previous.checkin_date, score: prevScore.total },
        { date: latest.checkin_date, score: latestScore.total },
      ],
    },
    disclaimer: INSIGHT_DISCLAIMER,
    generatedAt: new Date().toISOString(),
  };
}

function highestRatedItemObservation(recent: SymptomCheckin[]): Insight | null {
  const averages = MRS_INSTRUMENT.items.map((item) => {
    const key = getItemStorageKey(item);
    const values = recent
      .map((c) => c[key as keyof SymptomCheckin] as number | null)
      .filter((v): v is number => v !== null);
    const avg =
      values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
    return { key, label: item.label, subscale: item.subscale, avg };
  });

  const top = [...averages].sort((a, b) => b.avg - a.avg)[0];
  if (!top || top.avg < 1.5) return null;

  const subscaleLabel =
    MRS_SUBSCALE_FRIENDLY_LABELS[top.subscale] ?? top.subscale;

  return {
    id: `obs-highest-${top.key}`,
    category: 'observation',
    priority: 'low',
    title: 'What you logged recently',
    body: finalizeInsightBody(
      provisionalBody(
        `Across your recent check-ins, ${top.label.toLowerCase()} had the highest average rating (${subscaleLabel} subscale).`,
      ),
      { n: recent.length },
      false,
    ),
    sampleSize: { n: recent.length },
    confidence: provisionalInsightConfidence(),
    supportingData: {},
    relatedSymptoms: [top.key],
    disclaimer: INSIGHT_DISCLAIMER,
    generatedAt: new Date().toISOString(),
  };
}

export function analyzeEarlyObservations(input: EarlyObservationsInput): Insight[] {
  const mrsCheckins = sortedMrsCheckins(input.checkins);
  if (mrsCheckins.length === 0) return [];

  const insights: Insight[] = [];

  if (mrsCheckins.length === 1) {
    insights.push(baselineObservation(mrsCheckins[0]));
  }

  if (mrsCheckins.length >= 2) {
    const previous = mrsCheckins[mrsCheckins.length - 2];
    const latest = mrsCheckins[mrsCheckins.length - 1];
    insights.push(pairObservation(previous, latest));
  }

  if (mrsCheckins.length >= 3) {
    const recent = mrsCheckins.slice(-5);
    const highest = highestRatedItemObservation(recent);
    if (highest) insights.push(highest);
  }

  return insights;
}
