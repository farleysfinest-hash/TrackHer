import autoTable from 'jspdf-autotable';
import type { ExtendedSymptomLog, QuickLogEvent } from '../../../types/database';
import type { SymptomCheckin } from '../../../types/database';
import type { DateRange } from '../../../stores/dashboardStore';
import { getSymptomByKey } from '../../../data/symptoms';
import type { PdfPageContext } from '../pdfTheme';
import { PDF_COLORS, drawSectionHeader, drawSubheader, trendArrow } from '../pdfTheme';

interface ExtendedSymptomSummary {
  symptomKey: string;
  label: string;
  avgSeverity: string;
  trend: string;
  patterns: string[];
}

function buildExtendedSummaries(
  trackedKeys: string[],
  checkins: SymptomCheckin[],
  extendedLogs: ExtendedSymptomLog[],
  dateRange: DateRange,
): ExtendedSymptomSummary[] {
  const inRangeCheckinIds = new Set(
    checkins
      .filter((c) => c.checkin_date >= dateRange.start && c.checkin_date <= dateRange.end)
      .map((c) => c.id),
  );

  return trackedKeys.map((key) => {
    const def = getSymptomByKey(key);
    const logs = extendedLogs.filter(
      (l) => l.symptom_key === key && inRangeCheckinIds.has(l.checkin_id),
    );
    const scores = logs
      .map((l) => l.severity_score)
      .filter((s) => s !== null && s !== undefined) as number[];

    const avg =
      scores.length > 0
        ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
        : '—';

    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];
    const arrow = trendArrow(lastScore ?? 0, firstScore !== undefined ? firstScore : undefined);

    return {
      symptomKey: key,
      label: def?.label ?? key,
      avgSeverity: avg,
      trend: arrow,
      patterns: [],
    };
  });
}

function buildQuickLogSummaries(
  events: QuickLogEvent[],
  watchSymptomIds: string[],
  dateRange: DateRange,
): string[] {
  const summaries: string[] = [];

  for (const symptomId of watchSymptomIds) {
    const def = getSymptomByKey(symptomId);
    const symptomEvents = events.filter(
      (e) =>
        e.symptom_id === symptomId &&
        e.logged_at.slice(0, 10) >= dateRange.start &&
        e.logged_at.slice(0, 10) <= dateRange.end,
    );

    if (symptomEvents.length < 3) continue;

    const avgSeverity =
      symptomEvents.reduce((sum, e) => sum + e.severity, 0) / symptomEvents.length;

    const triggerCounts = new Map<string, number>();
    for (const e of symptomEvents) {
      const tag = e.trigger_tag ?? 'unknown';
      triggerCounts.set(tag, (triggerCounts.get(tag) ?? 0) + 1);
    }
    const topTrigger = [...triggerCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const triggerPct = topTrigger
      ? Math.round((topTrigger[1] / symptomEvents.length) * 100)
      : 0;

    const hourBuckets = new Map<string, number>();
    for (const e of symptomEvents) {
      const hour = new Date(e.logged_at).getHours();
      let bucket: string;
      if (hour < 6) bucket = '12-6 AM';
      else if (hour < 12) bucket = '6 AM-12 PM';
      else if (hour < 16) bucket = '12-4 PM';
      else if (hour < 20) bucket = '4-8 PM';
      else bucket = '8 PM-12 AM';
      hourBuckets.set(bucket, (hourBuckets.get(bucket) ?? 0) + 1);
    }
    const topTime = [...hourBuckets.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

    const days =
      Math.max(
        1,
        Math.round(
          (new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) /
            (24 * 60 * 60 * 1000),
        ) + 1,
      );

    summaries.push(
      `${def?.label ?? symptomId}: ${symptomEvents.length} logged over ${days} days, average severity ${avgSeverity.toFixed(1)}/10` +
        (topTrigger ? `, most common trigger: ${topTrigger[0].replace(/_/g, ' ')} (${triggerPct}%)` : '') +
        `, most common time: ${topTime}`,
    );
  }

  return summaries;
}

export function renderExtendedSymptomsPage(
  ctx: PdfPageContext,
  trackedSymptomKeys: string[],
  checkins: SymptomCheckin[],
  extendedLogs: ExtendedSymptomLog[],
  quickLogEvents: QuickLogEvent[],
  watchSymptomIds: string[],
  dateRange: DateRange,
): void {
  const { doc } = ctx;
  let y = 18;

  y = drawSectionHeader(
    doc,
    'Additional Symptom Tracking (PredictHer Extended Tracker)',
    y,
  );
  y = drawSubheader(
    doc,
    'These symptoms are tracked by the patient beyond the standardized MRS assessment.',
    y,
  );

  const summaries = buildExtendedSummaries(
    trackedSymptomKeys,
    checkins,
    extendedLogs,
    dateRange,
  );

  if (summaries.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.textMuted);
    doc.text('No extended symptoms tracked in this period.', 14, y);
    y += 10;
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Symptom', 'Avg severity (0-4)', 'Trend', 'Notable patterns']],
      body: summaries.map((s) => [
        s.label,
        s.avgSeverity,
        s.trend,
        s.patterns.length > 0 ? s.patterns.join('; ') : '—',
      ]),
      theme: 'striped',
      headStyles: { fillColor: PDF_COLORS.tableHead, textColor: [255, 255, 255], fontSize: 8 },
      styles: { fontSize: 8, textColor: PDF_COLORS.text },
      alternateRowStyles: { fillColor: PDF_COLORS.tableStripe },
      margin: { left: 14, right: 14 },
    });

    y =
      (doc as import('jspdf').jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? y + 20;
    y += 8;
  }

  const quickLogSummaries = buildQuickLogSummaries(quickLogEvents, watchSymptomIds, dateRange);

  if (quickLogSummaries.length > 0) {
    y = drawSectionHeader(doc, 'Quick-Log Summary', y);
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.text);
    for (const summary of quickLogSummaries) {
      const lines = doc.splitTextToSize(`• ${summary}`, 180);
      doc.text(lines, 14, y);
      y += lines.length * 4 + 2;
    }
  }
}
