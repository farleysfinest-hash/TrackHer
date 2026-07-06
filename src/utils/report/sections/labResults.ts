import autoTable from 'jspdf-autotable';
import type { UserOptions } from 'jspdf-autotable';
import type { LabResult } from '../../../types/database';
import type { DateRange } from '../../../stores/dashboardStore';
import { getBiomarkerByKey } from '../../../data/labRanges';
import { getBiomarkerValue, getValueStatus, BIOMARKER_KEYS } from '../../labHelpers';
import type { PdfPageContext } from '../pdfTheme';
import { PDF_COLORS, drawSectionHeader } from '../pdfTheme';
import { formatChartDateLong } from '../../chartHelpers';

export function renderLabResultsPage(
  ctx: PdfPageContext,
  labResults: LabResult[],
  dateRange: DateRange,
): void {
  const { doc } = ctx;
  const sortedLabs = [...labResults]
    .filter((l) => l.draw_date >= dateRange.start && l.draw_date <= dateRange.end)
    .sort((a, b) => b.draw_date.localeCompare(a.draw_date));

  if (sortedLabs.length === 0) return;

  const latestLab = sortedLabs[0];
  const priorLab = sortedLabs[1];

  let y = 18;
  y = drawSectionHeader(doc, 'Laboratory Results', y);

  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.textMuted);
  doc.text(`Most recent draw: ${formatChartDateLong(latestLab.draw_date)}`, 14, y + 4);
  y += 12;

  const filledKeys = BIOMARKER_KEYS.filter((key) => getBiomarkerValue(latestLab, key) !== null);

  const labRows: string[][] = [];
  for (const key of filledKeys) {
    const biomarker = getBiomarkerByKey(key);
    if (!biomarker) continue;
    const value = getBiomarkerValue(latestLab, key)!;
    const status = getValueStatus(value, biomarker);
    const priorVal = priorLab ? getBiomarkerValue(priorLab, key) : null;
    let trend = '—';
    if (priorVal !== null) {
      trend = value > priorVal ? '↑' : value < priorVal ? '↓' : '→';
    }
    const range = biomarker.optimalRange
      ? `${biomarker.optimalRange.min}–${biomarker.optimalRange.max}`
      : biomarker.conventionalRange
        ? `${biomarker.conventionalRange.min}–${biomarker.conventionalRange.max}`
        : '—';
    labRows.push([
      biomarker.label,
      `${value} ${biomarker.unit}`,
      range,
      formatChartDateLong(latestLab.draw_date),
      status.replace(/_/g, ' '),
      trend,
    ]);
  }

  autoTable(doc, {
    startY: y,
    head: [['Test', 'Value', 'Reference range', 'Date', 'Status', 'Trend']],
    body: labRows,
    theme: 'grid',
    headStyles: { fillColor: PDF_COLORS.tableHead, textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 8, textColor: PDF_COLORS.text },
    alternateRowStyles: { fillColor: PDF_COLORS.tableStripe },
    margin: { left: 14, right: 14 },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 4) {
        const status = hookData.cell.raw as string;
        if (status.includes('out of range') || status.includes('high') || status.includes('low')) {
          hookData.cell.styles.textColor = PDF_COLORS.alert;
          hookData.cell.styles.fontStyle = 'bold';
        }
      }
    },
  } satisfies UserOptions);
}

export function hasLabResultsInRange(labResults: LabResult[], dateRange: DateRange): boolean {
  return labResults.some(
    (l) => l.draw_date >= dateRange.start && l.draw_date <= dateRange.end,
  );
}
