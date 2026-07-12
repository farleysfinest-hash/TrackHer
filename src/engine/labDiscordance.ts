import { HORMONE_PATTERNS } from './hormonePatterns';
import { LAB_BIOMARKERS } from '../data/labRanges';
import type { Insight } from './types';
import { finalizeInsightBody, INSIGHT_DISCLAIMER } from './types';
import type { SymptomCheckin, LabResult } from '../types/database';
import type { MRSSymptomKey } from '../utils/checkinHelpers';
import { hasMRSData } from '../utils/checkinHelpers';
import { getBiomarkerValue } from '../utils/labHelpers';

interface LabDiscordanceInput {
  checkins: SymptomCheckin[];
  labResults: LabResult[];
}

function avgSymptomSeverity(checkins: SymptomCheckin[], key: string): number | null {
  const values = checkins
    .map((c) => (c[key as MRSSymptomKey] as number | null) ?? null)
    .filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function analyzeLabDiscordance(input: LabDiscordanceInput): Insight[] {
  const insights: Insight[] = [];
  const { checkins, labResults } = input;

  if (checkins.length === 0 || labResults.length === 0) return [];

  const recentLab = [...labResults].sort((a, b) => b.draw_date.localeCompare(a.draw_date))[0];
  const recentCheckins = [...checkins]
    .filter(hasMRSData)
    .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date))
    .slice(0, 3);

  const labDate = new Date(recentLab.draw_date + 'T12:00:00');
  const checkinDate = new Date(recentCheckins[0].checkin_date + 'T12:00:00');
  const daysBetween = Math.abs(
    (checkinDate.getTime() - labDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysBetween > 90) return [];

  for (const pattern of HORMONE_PATTERNS) {
    const activeSymptomCount = pattern.primarySymptoms.filter((sk) => {
      const avg = avgSymptomSeverity(recentCheckins, sk);
      return avg !== null && avg >= 2;
    }).length;

    if (activeSymptomCount < 3) continue;

    for (const labRef of pattern.relatedLabs) {
      const labValue = getBiomarkerValue(recentLab, labRef.biomarkerKey);
      if (labValue === null) continue;

      const biomarker = LAB_BIOMARKERS.find((b) => b.key === labRef.biomarkerKey);
      if (!biomarker) continue;

      let isLabContradicting = false;
      let contradiction = '';

      if (labRef.expectedDirection === 'low') {
        if (
          biomarker.conventionalRange &&
          labValue >= biomarker.conventionalRange.min
        ) {
          isLabContradicting = true;
          contradiction = `Your ${biomarker.label} is ${labValue} ${biomarker.unit}, which falls within the conventional reference range (${biomarker.conventionalRange.min}-${biomarker.conventionalRange.max}). Your logged symptoms remain elevated alongside this lab value.`;
        }
      } else if (labRef.expectedDirection === 'high') {
        if (
          biomarker.conventionalRange &&
          labValue <= biomarker.conventionalRange.max
        ) {
          isLabContradicting = true;
          contradiction = `Your ${biomarker.label} is ${labValue} ${biomarker.unit}, within conventional range, while your logged symptom pattern remains consistent with excess for you. Individual sensitivity varies.`;
        }
      }

      if (isLabContradicting) {
        const labSample = { n: recentCheckins.length };
        insights.push({
          id: `lab-discord-${pattern.key}-${labRef.biomarkerKey}`,
          category: 'lab_discordance',
          priority: 'medium',
          title: `${biomarker.label} is within the conventional range while your symptoms remain elevated`,
          body: finalizeInsightBody(
            `${contradiction} ${biomarker.optimalRange ? `Some practitioners target an optimal range of ${biomarker.optimalRange.min}-${biomarker.optimalRange.max} ${biomarker.unit} for symptom relief, which differs from the conventional lab range.` : ''} This is worth discussing with your provider — "normal" on paper does not always match how you feel.`,
            labSample,
            true,
          ),
          sampleSize: labSample,
          relatedLabs: [labRef.biomarkerKey],
          relatedSymptoms: pattern.primarySymptoms,
          supportingData: {
            labValue: {
              biomarker: biomarker.label,
              value: labValue,
              range: biomarker.conventionalRange
                ? `${biomarker.conventionalRange.min}-${biomarker.conventionalRange.max} ${biomarker.unit}`
                : 'N/A',
            },
            matchedPattern: pattern.key,
          },
          actionSuggestion: `Ask your provider: "My ${biomarker.label} is within range, but I'm still experiencing ${pattern.label.toLowerCase()} symptoms. Could my personal optimal level be different from the standard range?"`,
          disclaimer: INSIGHT_DISCLAIMER,
          generatedAt: new Date().toISOString(),
        });
      }
    }
  }

  return insights;
}
