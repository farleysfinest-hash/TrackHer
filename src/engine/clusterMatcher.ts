import { HORMONE_PATTERNS } from './hormonePatterns';
import type { Insight } from './types';
import { INSIGHT_DISCLAIMER } from './types';
import type { SymptomCheckin, ExtendedSymptomLog } from '../types/database';
import { SYMPTOM_CATALOG } from '../data/symptoms';
import type { MRSSymptomKey } from '../utils/checkinHelpers';

interface ClusterMatchInput {
  checkins: SymptomCheckin[];
  extendedSymptoms: ExtendedSymptomLog[];
}

const MRS_KEYS: MRSSymptomKey[] = [
  'hot_flashes',
  'heart_discomfort',
  'sleep_problems',
  'depressed_mood',
  'irritability',
  'anxiety',
  'exhaustion',
  'sexual_problems',
  'bladder_problems',
  'vaginal_dryness',
  'joint_muscle_pain',
  'dry_itchy_skin',
  'brain_fog',
  'irregular_periods',
  'heavy_bleeding',
  'misophonia',
];

function severityFromExtended(severity: ExtendedSymptomLog['severity']): number {
  if (severity === 'mild') return 1;
  if (severity === 'moderate') return 2;
  return 3;
}

export function analyzeSymptomClusters(input: ClusterMatchInput): Insight[] {
  const insights: Insight[] = [];
  const { checkins, extendedSymptoms } = input;

  if (checkins.length === 0) return [];

  const recentCheckins = [...checkins]
    .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date))
    .slice(0, 3);

  const severityMap = new Map<string, number>();

    for (const key of MRS_KEYS) {
      const values = recentCheckins
        .map((c) => c[key])
        .filter((v): v is NonNullable<typeof v> => v !== null)
        .map((v) => Number(v));
      if (values.length > 0) {
        severityMap.set(key, values.reduce((a, b) => a + b, 0) / values.length);
      }
    }

  const recentCheckinId = recentCheckins[0]?.id;
  if (recentCheckinId) {
    for (const ext of extendedSymptoms.filter((e) => e.checkin_id === recentCheckinId)) {
      severityMap.set(ext.symptom_key, severityFromExtended(ext.severity));
    }
  }

  for (const pattern of HORMONE_PATTERNS) {
    const primaryMatches: Array<{ key: string; label: string; severity: number }> = [];
    const secondaryMatches: Array<{ key: string; label: string; severity: number }> = [];

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

    if (primaryMatches.length < 3) continue;

    const primaryRatio = primaryMatches.length / pattern.primarySymptoms.length;
    const secondaryBoost = Math.min(secondaryMatches.length * 0.05, 0.2);
    const confidence = Math.min(primaryRatio + secondaryBoost, 1.0);

    const allMatches = [...primaryMatches, ...secondaryMatches];
    const matchedLabels = primaryMatches.map((m) => m.label);

    insights.push({
      id: `cluster-${pattern.key}`,
      category: 'symptom_cluster',
      priority: confidence >= 0.7 ? 'high' : 'medium',
      title: `Your symptoms suggest a ${pattern.label.toLowerCase()}`,
      body: `${pattern.description} You are currently experiencing ${matchedLabels.join(', ')} at moderate or higher severity — ${primaryMatches.length} of ${pattern.primarySymptoms.length} hallmark symptoms of this pattern.`,
      supportingData: {
        matchedPattern: pattern.key,
        matchedSymptoms: allMatches,
        matchConfidence: Math.round(confidence * 100) / 100,
      },
      relatedSymptoms: allMatches.map((m) => m.key),
      relatedLabs: pattern.relatedLabs.map((l) => l.biomarkerKey),
      actionSuggestion: `Questions to consider for your provider:\n${pattern.discussionPoints.map((q) => `• ${q}`).join('\n')}`,
      disclaimer: INSIGHT_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    });
  }

  return insights;
}
