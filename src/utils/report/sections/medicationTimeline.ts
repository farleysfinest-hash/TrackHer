import type { Medication, MedicationChange, SymptomCheckin } from '../../../types/database';
import type { DateRange } from '../../../stores/dashboardStore';
import type { PdfPageContext } from '../pdfTheme';
import { PDF_COLORS, drawSectionHeader } from '../pdfTheme';
import { formatChartDateLong } from '../../chartHelpers';
import { hasMRSData } from '../../checkinHelpers';
import { formatMedicationDoseShort } from '../../medicationHelpers';

function dateToX(
  date: string,
  rangeStart: string,
  rangeEnd: string,
  chartX: number,
  chartWidth: number,
): number {
  const start = new Date(rangeStart + 'T12:00:00').getTime();
  const end = new Date(rangeEnd + 'T12:00:00').getTime();
  const current = new Date(date + 'T12:00:00').getTime();
  const ratio = (current - start) / Math.max(end - start, 1);
  return chartX + ratio * chartWidth;
}

export function renderMedicationTimelinePage(
  ctx: PdfPageContext,
  medications: Medication[],
  medicationChanges: MedicationChange[],
  checkins: SymptomCheckin[],
  dateRange: DateRange,
): void {
  const { doc } = ctx;
  const medsInRange = medications.filter(
    (m) =>
      m.start_date <= dateRange.end &&
      (m.end_date ?? '9999-12-31') >= dateRange.start,
  );

  if (medsInRange.length === 0) return;

  let y = 18;
  y = drawSectionHeader(doc, 'Medication Timeline', y);
  y += 4;

  const chartX = 50;
  const chartWidth = 140;
  const barHeight = 8;
  const rowGap = 14;

  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.textMuted);
  doc.text(formatChartDateLong(dateRange.start), chartX, y);
  doc.text(formatChartDateLong(dateRange.end), chartX + chartWidth, y, { align: 'right' });
  y += 6;

  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.2);
  doc.line(chartX, y, chartX + chartWidth, y);

  y += 8;

  for (const med of medsInRange) {
    const barStart = med.start_date > dateRange.start ? med.start_date : dateRange.start;
    const barEnd =
      (med.end_date ?? dateRange.end) < dateRange.end
        ? (med.end_date ?? dateRange.end)
        : dateRange.end;
    const x1 = dateToX(barStart, dateRange.start, dateRange.end, chartX, chartWidth);
    const x2 = dateToX(barEnd, dateRange.start, dateRange.end, chartX, chartWidth);

    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.text);
    const name =
      med.medication_name.length > 18
        ? med.medication_name.slice(0, 16) + '…'
        : med.medication_name;
    doc.text(name, 14, y + barHeight / 2 + 1);

    doc.setFillColor(100, 100, 100);
    doc.rect(x1, y, Math.max(x2 - x1, 2), barHeight, 'F');

    doc.setFontSize(6);
    doc.setTextColor(...PDF_COLORS.textMuted);
    doc.text(formatMedicationDoseShort(med), x1, y + barHeight + 4);

    const medChanges = medicationChanges
      .filter((c) => c.medication_id === med.id)
      .filter((c) => c.change_date >= dateRange.start && c.change_date <= dateRange.end);

    for (const change of medChanges) {
      const cx = dateToX(change.change_date, dateRange.start, dateRange.end, chartX, chartWidth);
      doc.setDrawColor(...PDF_COLORS.accent);
      doc.setLineWidth(0.5);
      doc.line(cx, y - 2, cx, y + barHeight + 2);
      const note =
        change.change_type === 'dose_increased' || change.change_type === 'dose_decreased'
          ? `${change.previous_dose ?? '?'}→${change.new_dose ?? '?'}`
          : change.change_type.replace(/_/g, ' ');
      doc.setFontSize(5);
      doc.text(note, cx, y - 3, { align: 'center', maxWidth: 25 });
    }

    y += rowGap + 4;
  }

  const sortedCheckins = [...checkins]
    .filter(hasMRSData)
    .filter((c) => c.checkin_date >= dateRange.start && c.checkin_date <= dateRange.end)
    .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));

  const startedMeds = medsInRange.filter((m) => m.start_date >= dateRange.start);
  if (startedMeds.length > 0 && sortedCheckins.length >= 2) {
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text('Correlation notes', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');

    for (const med of startedMeds.slice(0, 3)) {
      const startDate = med.start_date;
      const before = sortedCheckins.filter((c) => c.checkin_date < startDate);
      const after = sortedCheckins.filter((c) => c.checkin_date >= startDate);

      if (before.length > 0 && after.length > 0) {
        const beforeAvg = before.reduce((s, c) => s + c.total_score, 0) / before.length;
        const afterAvg = after.reduce((s, c) => s + c.total_score, 0) / after.length;
        const weeks = Math.max(1, Math.round(after.length / 7));
        const note = `MRS score ${beforeAvg < afterAvg ? 'increased' : 'decreased'} from ${Math.round(beforeAvg)} to ${Math.round(afterAvg)} during first ${weeks} week(s) of ${med.medication_name}`;
        const lines = doc.splitTextToSize(`• ${note}`, 180);
        doc.setFontSize(7);
        doc.setTextColor(...PDF_COLORS.textMuted);
        doc.text(lines, 14, y);
        y += lines.length * 3.5 + 2;
      }
    }
  }
}

export function hasMedicationsInRange(medications: Medication[], dateRange: DateRange): boolean {
  return medications.some(
    (m) =>
      m.start_date <= dateRange.end &&
      (m.end_date ?? '9999-12-31') >= dateRange.start,
  );
}
