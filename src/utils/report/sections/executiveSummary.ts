import type {
  Profile,
  Medication,
  MedicationAdministration,
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
import { dateISOInTimeZone } from '../../localDate';
import {
  PDF_COLORS,
  drawSectionHeader,
  drawSubheader,
  addNewPage,
  contentBottomLimit,
} from '../pdfTheme';
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
  administrations: MedicationAdministration[];
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

function formatGeneratedDate(iso: string, timezone: string): string {
  const datePart = dateISOInTimeZone(iso, timezone);
  return formatChartDateLong(datePart);
}

function isWellbeingSafetyInsight(insight: Insight): boolean {
  return MENTAL_HEALTH_CATEGORIES.includes(insight.category);
}

function nonSafeguardingInsights(result: ReturnType<typeof runPatternEngine>): Insight[] {
  return [...result.primary, ...result.more]
    .filter((insight) => !isWellbeingSafetyInsight(insight) && !insight.demotedToMore)
    .slice(0, 6);
}

function wellbeingSafetyInsights(result: ReturnType<typeof runPatternEngine>): Insight[] {
  return result.all.filter((insight) => isWellbeingSafetyInsight(insight));
}

/** Y at which content starts on any page of this section. */
const CONTENT_TOP = 18;
const BODY_LINE_HEIGHT = 4.5;

/**
 * Returns a Y with `needed` mm of room below it, breaking to a new page if the current one is
 * full.
 *
 * Nothing here used to check the page bounds at all: `y` simply accumulated across up to six
 * insights plus the wellbeing notes. A single bleeding red flag body is roughly 86mm, so two or
 * three insights wrote past the footer and off the page — silently, in the clinical document the
 * patient hands to her provider.
 */
function ensureSpace(ctx: PdfPageContext, y: number, needed: number): number {
  if (y + needed <= contentBottomLimit(ctx.doc)) return y;
  addNewPage(ctx);
  return CONTENT_TOP;
}

/** Exported for the pagination test — the flow logic is the part worth pinning. */
export function renderInsightBlock(
  ctx: PdfPageContext,
  insight: Insight,
  y: number,
  timezone: string,
): number {
  const { doc } = ctx;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(insight.title, 180);

  // Keep the title with at least its first body line — a heading stranded alone at the foot of a
  // page reads as a section that produced nothing.
  y = ensureSpace(ctx, y, titleLines.length * 5 + 3 + BODY_LINE_HEIGHT);
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(titleLines, 14, y);
  y += titleLines.length * 5 + 3;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const bodyLines: string[] = doc.splitTextToSize(`"${insight.body}"`, 180);

  // Line by line, so a body longer than a whole page flows instead of overflowing.
  for (const line of bodyLines) {
    y = ensureSpace(ctx, y, BODY_LINE_HEIGHT);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(line, 14, y);
    y += BODY_LINE_HEIGHT;
  }
  y += 2;

  const dataLine = `n = ${formatSampleSizeForDataLine(insight.sampleSize)}, generated ${formatGeneratedDate(insight.generatedAt, timezone)}`;
  y = ensureSpace(ctx, y, 4);
  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.textMuted);
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
    administrations: input.administrations,
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
      y = renderInsightBlock(ctx, insight, y, input.timezone);
    }
  }

  if (includeSafeguarding && wellbeingInsights.length > 0) {
    // Divider + header + the first insight's opening lines have to land together, or the
    // wellbeing section announces itself at the very bottom of a page and starts on the next.
    y = ensureSpace(ctx, y + 4, 24);
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
      y = renderInsightBlock(ctx, insight, y, input.timezone);
    }
  }
}
