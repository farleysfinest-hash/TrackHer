import autoTable from 'jspdf-autotable';
import type { ExtendedSymptomLog, QuickLogEvent } from '../../../types/database';
import type { SymptomCheckin } from '../../../types/database';
import type { DateRange } from '../../../stores/dashboardStore';
import { getSymptomByKey } from '../../../data/symptoms';
import type { PdfPageContext } from '../pdfTheme';
import { PDF_COLORS, drawSectionHeader, drawSubheader, trendArrow } from '../pdfTheme';
import {
  daysBetweenISO,
  hourInTimeZone,
  isValidTimeZone,
  resolveEventLocalDate,
} from '../../localDate';

interface ExtendedSymptomSummary {
  symptomKey: string;
  label: string;
  avgSeverity: string;
  trend: string;
  patterns: string[];
}

function buildExtendedSummaries(
  checkins: SymptomCheckin[],
  extendedLogs: ExtendedSymptomLog[],
  dateRange: DateRange,
): ExtendedSymptomSummary[] {
  const checkinDateById = new Map(
    checkins
      .filter((c) => c.checkin_date >= dateRange.start && c.checkin_date <= dateRange.end)
      .map((c) => [c.id, c.checkin_date]),
  );
  const inRangeLogs = extendedLogs.filter((log) => checkinDateById.has(log.checkin_id));
  const recordedKeys = [...new Set(inRangeLogs.map((log) => log.symptom_key))];

  return recordedKeys.map((key) => {
    const def = getSymptomByKey(key);
    const logs = inRangeLogs
      .filter((log) => log.symptom_key === key)
      .sort((a, b) => {
        const dateComparison = (checkinDateById.get(a.checkin_id) ?? '').localeCompare(
          checkinDateById.get(b.checkin_id) ?? '',
        );
        return dateComparison || a.created_at.localeCompare(b.created_at);
      });
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
  dateRange: DateRange,
  timezone: string,
): string[] {
  const summaries: string[] = [];
  const inRangeEvents = events.filter((event) => {
    const eventDate = resolveEventLocalDate(
      event.logged_at,
      event.local_date,
      event.event_timezone,
      timezone,
    );
    return eventDate >= dateRange.start && eventDate <= dateRange.end;
  });
  const recordedSymptomIds = [...new Set(inRangeEvents.map((event) => event.symptom_id))];

  for (const symptomId of recordedSymptomIds) {
    const def = getSymptomByKey(symptomId);
    const symptomEvents = inRangeEvents.filter((event) => event.symptom_id === symptomId);

    if (symptomEvents.length < 3) continue;

    const withSeverity = symptomEvents.filter((e) => e.severity !== null);
    const avgSeverity =
      withSeverity.length > 0
        ? withSeverity.reduce((sum, e) => sum + (e.severity as number), 0) / withSeverity.length
        : null;

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
      const hour = hourInTimeZone(
        e.logged_at,
        isValidTimeZone(e.event_timezone) ? e.event_timezone : timezone,
      );
      let bucket: string;
      if (hour < 6) bucket = '12-6 AM';
      else if (hour < 12) bucket = '6 AM-12 PM';
      else if (hour < 16) bucket = '12-4 PM';
      else if (hour < 20) bucket = '4-8 PM';
      else bucket = '8 PM-12 AM';
      hourBuckets.set(bucket, (hourBuckets.get(bucket) ?? 0) + 1);
    }
    const topTime = [...hourBuckets.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

    const days = Math.max(1, daysBetweenISO(dateRange.start, dateRange.end) + 1);

    summaries.push(
      `${def?.label ?? symptomId}: ${symptomEvents.length} logged over ${days} days` +
        (avgSeverity !== null ? `, average severity ${avgSeverity.toFixed(1)}/10` : '') +
        (topTrigger ? `, most common trigger: ${topTrigger[0].replace(/_/g, ' ')} (${triggerPct}%)` : '') +
        `, most common time: ${topTime}`,
    );
  }

  return summaries;
}

export function renderExtendedSymptomsPage(
  ctx: PdfPageContext,
  checkins: SymptomCheckin[],
  extendedLogs: ExtendedSymptomLog[],
  quickLogEvents: QuickLogEvent[],
  dateRange: DateRange,
  timezone: string,
): void {
  const { doc } = ctx;
  let y = 18;

  y = drawSectionHeader(
    doc,
    'Additional Symptom Tracking (TrackHer Extended Tracker)',
    y,
  );
  y = drawSubheader(
    doc,
    'These symptoms are tracked by the patient beyond the standardized MRS assessment.',
    y,
  );

  const summaries = buildExtendedSummaries(
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

  const quickLogSummaries = buildQuickLogSummaries(
    quickLogEvents,
    dateRange,
    timezone,
  );

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
