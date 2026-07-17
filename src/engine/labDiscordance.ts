import { HORMONE_PATTERNS } from './hormonePatterns';
import { LAB_BIOMARKERS } from '../data/labRanges';
import type { Insight } from './types';
import { finalizeInsightBody, INSIGHT_DISCLAIMER } from './types';
import type { SymptomCheckin, LabResult } from '../types/database';
import type { MRSSymptomKey } from '../utils/checkinHelpers';
import { hasMRSData } from '../utils/checkinHelpers';
import {
  BIOMARKER_KEYS,
  getBiomarkerValue,
  getValueStatus,
} from '../utils/labHelpers';
import { computeObservationalConfidence } from './confidence';
import { daysBetweenISO } from '../utils/localDate';

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

  if (recentCheckins.length === 0) return [];

  const daysBetween = Math.abs(
    daysBetweenISO(recentLab.draw_date, recentCheckins[0].checkin_date),
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

      const conventionalRange = biomarker.conventionalRange;
      if (
        !conventionalRange ||
        labValue < conventionalRange.min ||
        labValue > conventionalRange.max
      ) {
        continue;
      }

      if (labRef.expectedDirection === 'low') {
        isLabContradicting = true;
        contradiction = `Your ${biomarker.label} is ${labValue} ${biomarker.unit}, which falls within the conventional reference range (${conventionalRange.min}-${conventionalRange.max}). Your logged symptoms remain elevated alongside this lab value.`;
      } else if (labRef.expectedDirection === 'high') {
        isLabContradicting = true;
        contradiction = `Your ${biomarker.label} is ${labValue} ${biomarker.unit}, within conventional range, while your logged symptom pattern remains consistent with excess for you. Individual sensitivity varies.`;
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
          confidence: computeObservationalConfidence({
            sampleFloor: 3,
            sampleCount: recentCheckins.length,
            windowDays: 90,
            actualInWindow: recentCheckins.length,
            mostRecentDataDate:
              recentCheckins[0].checkin_date > recentLab.draw_date
                ? recentCheckins[0].checkin_date
                : recentLab.draw_date,
            sampleSize: labSample,
          }),
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

/**
 * Flags biomarkers outside the conventional reference range on the latest draw.
 * Discordance (above) only fires for in-range labs; without this, HRT therapeutic
 * or "dangerous" out-of-range values leave the Lab tab empty after labs are logged.
 */
export function analyzeLabRangeFlags(labResults: LabResult[]): Insight[] {
  if (labResults.length === 0) return [];

  const recentLab = [...labResults].sort((a, b) => b.draw_date.localeCompare(a.draw_date))[0];
  const insights: Insight[] = [];

  for (const key of BIOMARKER_KEYS) {
    const labValue = getBiomarkerValue(recentLab, key);
    if (labValue === null) continue;

    const biomarker = LAB_BIOMARKERS.find((b) => b.key === key);
    if (!biomarker?.conventionalRange) continue;

    const status = getValueStatus(labValue, biomarker);
    if (status !== 'out_of_range') continue;

    const { min, max } = biomarker.conventionalRange;
    const isHigh = labValue > max;
    const direction = isHigh ? 'above' : 'below';
    const warning = isHigh ? biomarker.warningHigh : biomarker.warningLow;
    const sampleSize = { n: 1 };

    insights.push({
      id: `lab-range-${key}`,
      category: 'lab_discordance',
      priority: 'medium',
      title: `${biomarker.label} is ${direction} the conventional reference range`,
      body: finalizeInsightBody(
        `Your most recent ${biomarker.label} was ${labValue} ${biomarker.unit} (conventional range ${min}–${max} ${biomarker.unit}).${
          warning ? ` ${warning}` : ''
        }${
          biomarker.optimalRange
            ? ` Some practitioners target ${biomarker.optimalRange.min}–${biomarker.optimalRange.max} ${biomarker.unit} for symptom relief.`
            : ''
        } Worth reviewing with your provider in context of your symptoms and HRT.`,
        sampleSize,
        true,
      ),
      sampleSize,
      confidence: computeObservationalConfidence({
        sampleFloor: 1,
        sampleCount: 1,
        windowDays: 90,
        actualInWindow: 1,
        mostRecentDataDate: recentLab.draw_date,
        sampleSize,
      }),
      relatedLabs: [key],
      supportingData: {
        labValue: {
          biomarker: biomarker.label,
          value: labValue,
          range: `${min}-${max} ${biomarker.unit}`,
        },
      },
      actionSuggestion: `Ask your provider: "My ${biomarker.label} came back ${labValue} ${biomarker.unit}. How should we interpret that alongside my symptoms?"`,
      disclaimer: INSIGHT_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    });
  }

  return insights;
}
