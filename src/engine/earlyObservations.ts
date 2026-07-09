import type { Insight } from './types';
import { INSIGHT_DISCLAIMER } from './types';
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
      value: score.subscales[sub.id]?.score ?? 0,
    }))
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
  const band = getMRSSeverityBand(score.total);
  const subscale = topSubscaleLabel(score);

  return {
    id: 'obs-baseline',
    category: 'observation',
    priority: 'low',
    title: `Your baseline: ${band.bandLabel} symptom severity`,
    body: `Your first MRS score is ${score.total} of ${MRS_TOTAL_MAX} — ${band.rangePhrase}. Your ${subscale} ratings contribute the most. This is your baseline: every future check-in measures change against it.`,
    supportingData: {
      trendData: [{ date: checkin.checkin_date, score: score.total }],
    },
    actionSuggestion:
      "Scores of 9+ are generally considered clinically relevant — worth bringing to your provider if you haven't already.",
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
    const before = (previous[key as keyof SymptomCheckin] as number | null) ?? 0;
    const after = (latest[key as keyof SymptomCheckin] as number | null) ?? 0;
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
  const totalDelta = latestScore.total - prevScore.total;
  const absDelta = Math.abs(totalDelta);

  if (absDelta < 2) {
    return {
      id: `obs-steady-${latest.checkin_date}`,
      category: 'observation',
      priority: 'low',
      title: 'Holding steady',
      body: `Your overall MRS score is ${latestScore.total} of ${MRS_TOTAL_MAX} — essentially unchanged from your last check-in (${prevScore.total}). Stability is information too, especially when you are tracking over time.`,
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
    ? ` The biggest change: ${symptomChange.label.toLowerCase()}, ${
        symptomChange.after < symptomChange.before ? 'down' : 'up'
      } from ${symptomChange.before} to ${symptomChange.after}.`
    : '';

  return {
    id: `obs-delta-${latest.checkin_date}`,
    category: 'observation',
    priority: 'low',
    title: 'Since your last check-in',
    body: `Your overall score moved from ${prevScore.total} to ${latestScore.total}.${symptomSentence}`,
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
    body: `Across your recent check-ins, ${top.label.toLowerCase()} has consistently rated highest (${subscaleLabel} subscale). If one thing is driving how you feel, it's likely this.`,
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
