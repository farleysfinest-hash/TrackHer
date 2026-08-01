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
      const reported = (recentLab.reported_values ?? {})[labRef.biomarkerKey] ?? null;

      let isLabContradicting = false;
      let contradiction = '';

      const generalRange = biomarker.referenceSource ? biomarker.conventionalRange : null;
      const isReportedInRange = reported?.reportedFlag === 'normal';
      const isInGeneralRange = Boolean(
        generalRange && labValue >= generalRange.min && labValue <= generalRange.max,
      );
      if (!isReportedInRange && !isInGeneralRange) {
        continue;
      }

      const rangeDescription = reported?.referenceText
        ? `the reference interval printed by your laboratory (${reported.referenceText}${reported.reportedUnit ? ` ${reported.reportedUnit}` : ''})`
        : `TrackHer’s general reference context (${generalRange?.min}-${generalRange?.max} ${biomarker.unit})`;

      if (labRef.expectedDirection === 'low') {
        isLabContradicting = true;
        contradiction = `Your recorded ${biomarker.label} falls within ${rangeDescription}, while your logged symptoms remain elevated.`;
      } else if (labRef.expectedDirection === 'high') {
        isLabContradicting = true;
        contradiction = `Your recorded ${biomarker.label} falls within ${rangeDescription}, while your logged symptoms remain elevated.`;
      }

      if (isLabContradicting) {
        const labSample = { n: recentCheckins.length };
        insights.push({
          id: `lab-discord-${pattern.key}-${labRef.biomarkerKey}`,
          category: 'lab_discordance',
          priority: 'medium',
          title: `${biomarker.label} is within its reference context while your symptoms remain elevated`,
          body: finalizeInsightBody(
            `${contradiction} A reference interval is a comparison guide, not a personal treatment target, so it does not by itself show whether treatment is working for you. Discuss both the result and your symptoms with your doctor.`,
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
              range: reported?.referenceText ?? (generalRange
                ? `${generalRange.min}-${generalRange.max} ${biomarker.unit} (general context)`
                : 'N/A'),
            },
            matchedPattern: pattern.key,
          },
          actionSuggestion: `Ask your provider: "My ${biomarker.label} is within the laboratory reference interval, but I'm still experiencing ${pattern.label.toLowerCase()} symptoms. How should we interpret the result alongside my symptoms, timing, and treatment?"`,
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
    if (!biomarker) continue;
    const reported = (recentLab.reported_values ?? {})[key] ?? null;
    const status = reported?.reportedFlag === 'low' || reported?.reportedFlag === 'high' || reported?.reportedFlag === 'abnormal'
      ? 'out_of_range'
      : reported?.reportedFlag === 'normal'
        ? 'conventional'
        : getValueStatus(labValue, biomarker);
    if (status !== 'out_of_range') continue;

    const generalRange = biomarker.referenceSource ? biomarker.conventionalRange : null;
    const isHigh = reported?.reportedFlag === 'high' || Boolean(generalRange && labValue > generalRange.max);
    const direction = reported?.reportedFlag === 'abnormal' ? 'flagged by the laboratory' : isHigh ? 'above' : 'below';
    const rangeDescription = reported?.referenceText
      ? `${reported.referenceText}${reported.reportedUnit ? ` ${reported.reportedUnit}` : ''} (laboratory)`
      : generalRange
        ? `${generalRange.min}-${generalRange.max} ${biomarker.unit} (general context)`
        : 'not supplied';
    const sampleSize = { n: 1 };

    insights.push({
      id: `lab-range-${key}`,
      category: 'lab_discordance',
      priority: 'low',
      title: `${biomarker.label} is ${direction} its reference context`,
      body: finalizeInsightBody(
        `Your most recent ${biomarker.label} was ${reported ? `${reported.comparator ?? ''}${reported.reportedValue} ${reported.reportedUnit ?? ''}`.trim() : `${labValue} ${biomarker.unit}`}. The relevant reference context is ${rangeDescription}. A flag does not by itself determine a diagnosis or medication change, but it is worth discussing with your doctor alongside symptoms and collection timing.`,
        sampleSize,
        false,
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
          range: rangeDescription,
        },
      },
      actionSuggestion: `Ask your provider: "My ${biomarker.label} came back ${labValue} ${biomarker.unit}. How should we interpret that alongside my symptoms?"`,
      disclaimer: INSIGHT_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    });
  }

  return insights;
}
