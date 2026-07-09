import autoTable from 'jspdf-autotable';
import type { SymptomCheckin, MedicationChange, Medication } from '../../../types/database';
import type { DateRange } from '../../../stores/dashboardStore';
import { MRS_INSTRUMENT } from '../../../data/instruments/mrs';
import { getItemStorageKey, getSeverityLabel } from '../../../data/instruments/scoring';
import { scoreInstrument } from '../../../data/instruments/scoring';
import type { PdfPageContext } from '../pdfTheme';
import { PDF_COLORS, drawSectionHeader, trendArrow } from '../pdfTheme';
import { drawLineChart, type ChartMarker } from '../chartDrawing';
import { formatChartDateLong } from '../../chartHelpers';
import { hasMRSData } from '../../checkinHelpers';
import { getMrsTotalSeverityLevel, MRS_SEVERITY_REFERENCE } from '../../mrsTotalSeverity';

const MRS_REFERENCE =
  `The Menopause Rating Scale (MRS) is a validated, internationally standardized instrument for assessing menopausal symptom severity. ${MRS_SEVERITY_REFERENCE}`;

export function renderMrsAssessmentPage(
  ctx: PdfPageContext,
  checkins: SymptomCheckin[],
  medicationChanges: MedicationChange[],
  medications: Medication[],
  dateRange: DateRange,
): void {
  const { doc } = ctx;
  const sorted = [...checkins]
    .filter(hasMRSData)
    .filter((c) => c.checkin_date >= dateRange.start && c.checkin_date <= dateRange.end)
    .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));

  const latest = sorted[sorted.length - 1];
  let y = 18;

  y = drawSectionHeader(
    doc,
    'Menopause Rating Scale (MRS) — Validated Assessment',
    y,
  );
  y += 2;

  if (!latest) {
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.textMuted);
    doc.text('No MRS assessments in the reporting period.', 14, y);
    return;
  }

  const latestScore = scoreInstrument(
    latest as unknown as Record<string, number | null>,
    MRS_INSTRUMENT,
  );

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.text);
  doc.text('Current MRS Score', 14, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const scoreLines = [
    `Total: ${latestScore.total}/44 (${getSeverityLabel(getMrsTotalSeverityLevel(latestScore.total))})`,
    `Psychological subscale: ${latestScore.subscales.psychological?.score ?? 0}/16 (${getSeverityLabel(latestScore.subscales.psychological?.severity ?? 'none')})`,
    `Somatic subscale: ${latestScore.subscales.somatic?.score ?? 0}/16 (${getSeverityLabel(latestScore.subscales.somatic?.severity ?? 'none')})`,
    `Urogenital subscale: ${latestScore.subscales.urogenital?.score ?? 0}/12 (${getSeverityLabel(latestScore.subscales.urogenital?.severity ?? 'none')})`,
    `Most recent assessment: ${formatChartDateLong(latest.checkin_date)}`,
  ];
  for (const line of scoreLines) {
    doc.text(line, 14, y);
    y += 5;
  }

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('MRS Trend Over Time', 14, y);
  y += 6;

  const totalPoints = sorted.map((c) => ({
    date: c.checkin_date,
    value: c.total_score,
    label: String(c.total_score),
  }));

  const psychPoints = sorted.map((c) => ({
    date: c.checkin_date,
    value: c.psychological_score,
    label: String(c.psychological_score),
  }));

  const somaticPoints = sorted.map((c) => ({
    date: c.checkin_date,
    value: c.somatic_score,
    label: String(c.somatic_score),
  }));

  const urogenitalPoints = sorted.map((c) => ({
    date: c.checkin_date,
    value: c.urogenital_score,
    label: String(c.urogenital_score),
  }));

  const markers: ChartMarker[] = medicationChanges
    .filter(
      (c) =>
        c.change_date >= dateRange.start &&
        c.change_date <= dateRange.end &&
        (c.change_type === 'started' || c.change_type === 'dose_increased' || c.change_type === 'dose_decreased'),
    )
    .map((c) => {
      const med = medications.find((m) => m.id === c.medication_id);
      const shortName = med?.medication_name.split(' ')[0] ?? 'Med';
      return { date: c.change_date, label: shortName };
    });

  drawLineChart(
    doc,
    14,
    y,
    182,
    55,
    [
      { points: totalPoints, color: PDF_COLORS.chartLine, label: 'Total' },
      { points: psychPoints, color: PDF_COLORS.chartSubscale, dashed: true, label: 'Psych' },
      { points: somaticPoints, color: PDF_COLORS.chartSubscale, dashed: true, label: 'Somatic' },
      { points: urogenitalPoints, color: PDF_COLORS.chartSubscale, dashed: true, label: 'Urogenital' },
    ],
    0,
    44,
    markers,
  );

  y += 72;

  doc.setFont('helvetica', 'bold');
  doc.text('MRS Item-Level Detail', 14, y);
  y += 4;

  const earliest = sorted[0];
  const itemRows = MRS_INSTRUMENT.items.map((item) => {
    const storageKey = getItemStorageKey(item);
    const current = latest[storageKey as keyof SymptomCheckin] as number | null;
    const scores = sorted
      .map((c) => c[storageKey as keyof SymptomCheckin] as number | null)
      .filter((v): v is number => v !== null);
    const avg =
      scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
    const startVal = earliest
      ? (earliest[storageKey as keyof SymptomCheckin] as number | null)
      : null;
    const arrow = trendArrow(current ?? 0, startVal ?? undefined);

    return [
      item.label,
      current !== null ? String(current) : '—',
      avg,
      arrow,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Symptom', 'Current (0-4)', 'Period avg', 'Trend']],
    body: itemRows,
    theme: 'striped',
    headStyles: { fillColor: PDF_COLORS.tableHead, textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 8, textColor: PDF_COLORS.text },
    alternateRowStyles: { fillColor: PDF_COLORS.tableStripe },
    margin: { left: 14, right: 14 },
  });

  const finalY =
    (doc as import('jspdf').jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y + 40;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...PDF_COLORS.textMuted);
  const refLines = doc.splitTextToSize(MRS_REFERENCE, 180);
  doc.text(refLines, 14, finalY + 8);
}
