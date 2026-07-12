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

interface EarlyObservationsInput {
  checkins: SymptomCheckin[];
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
    title: `Your baseline: ${band.bandLabel} symptom severity`,
    body: finalizeInsightBody(
      `Your first MRS score is ${score.total} of ${MRS_TOTAL_MAX} — ${band.rangePhrase}. Your ${subscale} ratings contribute the most. This is your baseline: every future check-in measures change against it.`,
      { n: 1 },
      false,
    ),
    sampleSize: { n: 1 },
    actionSuggestion:
      "Scores of 9+ are generally considered clinically relevant — worth bringing to your provider if you haven't already.",
    supportingData: {
      trendData: [{ date: checkin.checkin_date, score: score.total }],
    },
    disclaimer: INSIGHT_DISCLAIMER,
    generatedAt: new Date().toISOString(),
  };
}

function largestSymptomDelta(
  previous: SymptomCheckin,
  latest: SymptomCheckin,
): { label: string; before: number; after: number; delta: number } | null {
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

function deltaObservation(previous: SymptomCheckin, latest: SymptomCheckin): Insight {
  const prevScore = scoreCheckin(previous);
  const latestScore = scoreCheckin(latest);
  if (
    !prevScore.isComplete ||
    !latestScore.isComplete ||
    prevScore.total === null ||
    latestScore.total === null
  ) {
    throw new Error('deltaObservation requires complete MRS check-ins');
  }
  const totalDelta = latestScore.total - prevScore.total;
  const absDelta = Math.abs(totalDelta);
  const pairSample = { n: 2 };

  if (absDelta < 2) {
    return {
      id: `obs-steady-${latest.checkin_date}`,
      category: 'observation',
      priority: 'low',
      title: 'Holding steady',
      body: finalizeInsightBody(
        `Your overall MRS score is ${latestScore.total} of ${MRS_TOTAL_MAX} — essentially unchanged from your last check-in (${prevScore.total}). Stability is information too, especially when you are tracking over time.`,
        pairSample,
        false,
      ),
      sampleSize: pairSample,
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

  const symptomChange = largestSymptomDelta(previous, latest);
  const symptomSentence = symptomChange
    ? ` The largest single-item shift was ${symptomChange.label.toLowerCase()}, from ${symptomChange.before} to ${symptomChange.after}.`
    : '';

  return {
    id: `obs-delta-${latest.checkin_date}`,
    category: 'observation',
    priority: 'low',
    title: 'Since your last check-in',
    body: finalizeInsightBody(
      `Your overall score moved from ${prevScore.total} to ${latestScore.total}.${symptomSentence}`,
      pairSample,
      false,
    ),
    sampleSize: pairSample,
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

function dominantSymptomObservation(recent: SymptomCheckin[]): Insight | null {
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
    id: `obs-dominant-${top.key}`,
    category: 'observation',
    priority: 'low',
    title: 'Your most consistent symptom',
    body: finalizeInsightBody(
      `Across your recent check-ins, ${top.label.toLowerCase()} has consistently rated highest (${subscaleLabel} subscale).`,
      { n: recent.length },
      false,
    ),
    sampleSize: { n: recent.length },
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
    insights.push(deltaObservation(previous, latest));
  }

  if (mrsCheckins.length >= 3) {
    const recent = mrsCheckins.slice(-5);
    const dominant = dominantSymptomObservation(recent);
    if (dominant) insights.push(dominant);
  }

  return insights;
}
