import { HORMONE_PATTERNS, type HormonePattern } from './hormonePatterns';
import type { Insight } from './types';
import { finalizeInsightBody, INSIGHT_DISCLAIMER } from './types';
import type { SymptomCheckin, ExtendedSymptomLog } from '../types/database';
import { SYMPTOM_CATALOG } from '../data/symptoms';
import { MRS_CANONICAL_KEYS, hasMRSData } from '../utils/checkinHelpers';
import { todayISO } from '../utils/localDate';

interface ClusterMatchInput {
  checkins: SymptomCheckin[];
  extendedSymptoms: ExtendedSymptomLog[];
}

const MIN_TOTAL_MRS_CHECKINS = 10;
const MIN_SPAN_DAYS = 21;
const WINDOW_DAYS = 30;
const MIN_WINDOW_CHECKINS = 4;

interface PatternMatchResult {
  pattern: HormonePattern;
  primaryMatches: Array<{ key: string; label: string; severity: number }>;
  secondaryMatches: Array<{ key: string; label: string; severity: number }>;
  confidence: number;
}

function severityFromExtended(log: ExtendedSymptomLog): number {
  if (log.severity_score !== null && log.severity_score !== undefined) {
    return log.severity_score;
  }
  if (log.severity === 'mild') return 1;
  if (log.severity === 'moderate') return 2;
  if (log.severity === 'severe') return 3;
  return 0;
}

function addDaysISO(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${month}-${day}`;
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T12:00:00');
  const b = new Date(to + 'T12:00:00');
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function buildSeverityMap(
  windowCheckins: SymptomCheckin[],
  extendedSymptoms: ExtendedSymptomLog[],
): Map<string, number> {
  const severityMap = new Map<string, number>();

  for (const key of MRS_CANONICAL_KEYS) {
    const values = windowCheckins
      .map((c) => c[key])
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .map((v) => Number(v));
    if (values.length > 0) {
      severityMap.set(key, values.reduce((a, b) => a + b, 0) / values.length);
    }
  }

  const checkinIds = new Set(windowCheckins.map((c) => c.id));
  const extBySymptom = new Map<string, number[]>();
  for (const ext of extendedSymptoms.filter((e) => checkinIds.has(e.checkin_id))) {
    const values = extBySymptom.get(ext.symptom_key) ?? [];
    values.push(severityFromExtended(ext));
    extBySymptom.set(ext.symptom_key, values);
  }
  for (const [key, values] of extBySymptom) {
    severityMap.set(key, values.reduce((a, b) => a + b, 0) / values.length);
  }

  return severityMap;
}

function matchPattern(
  severityMap: Map<string, number>,
  pattern: HormonePattern,
): PatternMatchResult | null {
  const primaryMatches: PatternMatchResult['primaryMatches'] = [];
  const secondaryMatches: PatternMatchResult['secondaryMatches'] = [];

  for (const symptomKey of pattern.primarySymptoms) {
    const severity = severityMap.get(symptomKey);
    if (severity !== undefined && severity >= 2) {
      const symptomDef = SYMPTOM_CATALOG.find((s) => s.key === symptomKey);
      primaryMatches.push({
        key: symptomKey,
        label: symptomDef?.label ?? symptomKey,
        severity: Math.round(severity * 10) / 10,
      });
    }
  }

  for (const symptomKey of pattern.secondarySymptoms) {
    const severity = severityMap.get(symptomKey);
    if (severity !== undefined && severity >= 1) {
      const symptomDef = SYMPTOM_CATALOG.find((s) => s.key === symptomKey);
      secondaryMatches.push({
        key: symptomKey,
        label: symptomDef?.label ?? symptomKey,
        severity: Math.round(severity * 10) / 10,
      });
    }
  }

  if (primaryMatches.length < 3) return null;

  const primaryRatio = primaryMatches.length / pattern.primarySymptoms.length;
  const secondaryBoost = Math.min(secondaryMatches.length * 0.05, 0.2);
  const confidence = Math.min(primaryRatio + secondaryBoost, 1.0);

  return { pattern, primaryMatches, secondaryMatches, confidence };
}

export function analyzeSymptomClusters(input: ClusterMatchInput): Insight[] {
  const { checkins, extendedSymptoms } = input;
  const mrsCheckins = [...checkins]
    .filter(hasMRSData)
    .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));

  if (mrsCheckins.length < MIN_TOTAL_MRS_CHECKINS) return [];

  const spanDays = daysBetween(
    mrsCheckins[0].checkin_date,
    mrsCheckins[mrsCheckins.length - 1].checkin_date,
  );
  if (spanDays < MIN_SPAN_DAYS) return [];

  const today = todayISO();
  const windowStart = addDaysISO(today, -WINDOW_DAYS);
  const eligibleCheckins = mrsCheckins.filter((c) => !c.is_backdated);
  const windowCheckins = eligibleCheckins.filter((c) => c.checkin_date >= windowStart);

  if (windowCheckins.length < MIN_WINDOW_CHECKINS) return [];

  const fullSeverityMap = buildSeverityMap(windowCheckins, extendedSymptoms);

  const midpoint = Math.ceil(windowCheckins.length / 2);
  const earlierHalf = windowCheckins.slice(0, midpoint);
  const laterHalf = windowCheckins.slice(midpoint);

  const insights: Insight[] = [];

  for (const pattern of HORMONE_PATTERNS) {
    const earlierMatch = matchPattern(
      buildSeverityMap(earlierHalf, extendedSymptoms),
      pattern,
    );
    const laterMatch = matchPattern(buildSeverityMap(laterHalf, extendedSymptoms), pattern);
    if (!earlierMatch || !laterMatch) continue;

    const fullMatch = matchPattern(fullSeverityMap, pattern);
    if (!fullMatch) continue;

    const { primaryMatches, secondaryMatches, confidence } = fullMatch;
    const allMatches = [...primaryMatches, ...secondaryMatches];
    const matchedLabels = primaryMatches.map((m) => m.label);

    insights.push({
      id: `cluster-${pattern.key}`,
      category: 'symptom_cluster',
      priority: confidence >= 0.7 ? 'high' : 'medium',
      title: `Your recent symptoms align with a ${pattern.label.toLowerCase()} pattern`,
      body: finalizeInsightBody(
        `Over the past month, your symptom profile has matched a ${pattern.label.toLowerCase()} pattern. ${pattern.description} You are experiencing ${matchedLabels.join(', ')} at moderate or higher severity on average — ${primaryMatches.length} of ${pattern.primarySymptoms.length} hallmark symptoms of this pattern.`,
        { n: windowCheckins.length },
        true,
      ),
      sampleSize: { n: windowCheckins.length },
      relatedSymptoms: allMatches.map((m) => m.key),
      relatedLabs: pattern.relatedLabs.map((l) => l.biomarkerKey),
      supportingData: {
        matchedPattern: pattern.key,
        matchedSymptoms: allMatches,
        matchConfidence: Math.round(confidence * 100) / 100,
      },
      actionSuggestion: `Questions to consider for your provider:\n${pattern.discussionPoints.map((q) => `• ${q}`).join('\n')}`,
      disclaimer: INSIGHT_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    });
  }

  return insights;
}
