import type jsPDF from 'jspdf';
import type {
  Profile,
  Medication,
  MedicationChange,
  SymptomCheckin,
  LabResult,
  ExtendedSymptomLog,
  QuickLogEvent,
} from '../../../types/database';
import type { DateRange } from '../../../stores/dashboardStore';
import { runPatternEngine } from '../../../engine/patternEngine';
import { MENTAL_HEALTH_CATEGORIES } from '../../../engine/types';
import type { Insight, InsightSampleSize } from '../../../engine/types';
import type { PdfPageContext } from '../pdfTheme';
import { PDF_COLORS, drawSectionHeader, drawSubheader } from '../pdfTheme';
import { formatChartDateLong } from '../../chartHelpers';
import { formatReportDateRange } from '../reportData';

export interface ExecutiveSummaryInput {
  profile: Profile;
  checkins: SymptomCheckin[];
  labResults: LabResult[];
  quickLogEvents: QuickLogEvent[];
  medications: Medication[];
  medicationChanges: MedicationChange[];
  extendedSymptomLogs: ExtendedSymptomLog[];
  dateRange: DateRange;
  timezone: string;
  includeSafeguarding: boolean;
}

function formatSampleSizeForDataLine(sampleSize: InsightSampleSize): string {
  if ('n' in sampleSize) {
    return String(sampleSize.n);
  }
  return `${sampleSize.before} before, ${sampleSize.after} after`;
}

function formatGeneratedDate(iso: string): string {
  const datePart = iso.slice(0, 10);
  return formatChartDateLong(datePart);
}

function isWellbeingSafetyInsight(insight: Insight): boolean {
  return MENTAL_HEALTH_CATEGORIES.includes(insight.category);
}

function nonSafeguardingInsights(result: ReturnType<typeof runPatternEngine>): Insight[] {
  return [...result.primary, ...result.more]
    .filter((insight) => !isWellbeingSafetyInsight(insight))
    .slice(0, 6);
}

function wellbeingSafetyInsights(result: ReturnType<typeof runPatternEngine>): Insight[] {
  return result.all.filter((insight) => isWellbeingSafetyInsight(insight));
}

function renderInsightBlock(doc: jsPDF, insight: Insight, y: number): number {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.text);
  const titleLines = doc.splitTextToSize(insight.title, 180);
  doc.text(titleLines, 14, y);
  y += titleLines.length * 5 + 3;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_COLORS.text);
  const quotedBody = `"${insight.body}"`;
  const bodyLines = doc.splitTextToSize(quotedBody, 180);
  doc.text(bodyLines, 14, y);
  y += bodyLines.length * 4.5 + 2;

  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.textMuted);
  const dataLine = `n = ${formatSampleSizeForDataLine(insight.sampleSize)}, generated ${formatGeneratedDate(insight.generatedAt)}`;
  doc.text(dataLine, 14, y);
  y += 8;

  return y;
}

export function renderExecutiveSummaryPage(
  ctx: PdfPageContext,
  input: ExecutiveSummaryInput,
): void {
  const { doc } = ctx;
  const { dateRange, includeSafeguarding } = input;

  const checkinsInRange = input.checkins.filter(
    (c) => c.checkin_date >= dateRange.start && c.checkin_date <= dateRange.end,
  );
  const checkinIds = new Set(checkinsInRange.map((c) => c.id));

  const engineResult = runPatternEngine({
    checkins: checkinsInRange,
    extendedSymptoms: input.extendedSymptomLogs.filter((e) => checkinIds.has(e.checkin_id)),
    medications: input.medications.filter(
      (m) =>
        m.start_date <= dateRange.end &&
        (m.end_date ?? '9999-12-31') >= dateRange.start,
    ),
    medicationChanges: input.medicationChanges.filter(
      (c) => c.change_date >= dateRange.start && c.change_date <= dateRange.end,
    ),
    administrations: [],
    labResults: input.labResults.filter(
      (l) => l.draw_date >= dateRange.start && l.draw_date <= dateRange.end,
    ),
    profile: input.profile,
    timezone: input.timezone,
  });

  const mainInsights = nonSafeguardingInsights(engineResult);
  const wellbeingInsights = wellbeingSafetyInsights(engineResult);

  let y = 18;
  y = drawSectionHeader(
    doc,
    "Summary of Patterns — surfaced to the patient by TrackHer's analysis",
    y,
  );
  y = drawSubheader(
    doc,
    `${formatReportDateRange(dateRange.start, dateRange.end)} · ${checkinsInRange.length} check-in${checkinsInRange.length === 1 ? '' : 's'} in range`,
    y,
  );

  if (mainInsights.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.textMuted);
    doc.text(
      'No patterns met the evidence threshold for this period. Raw data follows.',
      14,
      y,
    );
    y += 10;
  } else {
    for (const insight of mainInsights) {
      y = renderInsightBlock(doc, insight, y);
    }
  }

  if (includeSafeguarding && wellbeingInsights.length > 0) {
    y += 4;
    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(14, y, 196, y);
    y += 10;

    y = drawSectionHeader(
      doc,
      "Wellbeing safety notes — shared at the patient's request",
      y,
    );
    y += 2;

    for (const insight of wellbeingInsights) {
      y = renderInsightBlock(doc, insight, y);
    }
  }
}
