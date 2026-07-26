import type jsPDF from 'jspdf';

export const PDF_COLORS = {
  text: [40, 40, 40] as [number, number, number],
  textMuted: [100, 100, 100] as [number, number, number],
  header: [90, 90, 90] as [number, number, number],
  accent: [120, 90, 110] as [number, number, number],
  tableHead: [70, 70, 70] as [number, number, number],
  tableStripe: [245, 245, 245] as [number, number, number],
  border: [200, 200, 200] as [number, number, number],
  alert: [181, 79, 79] as [number, number, number],
  chartLine: [60, 60, 60] as [number, number, number],
  chartSubscale: [150, 150, 150] as [number, number, number],
  marker: [100, 100, 100] as [number, number, number],
};

export interface PdfPageContext {
  doc: jsPDF;
  patientName: string;
  reportDate: string;
  pageNum: number;
  totalPages: number;
}

/** Y coordinate of the footer rule. Content must stay above this. */
export function footerRuleY(doc: jsPDF): number {
  return doc.internal.pageSize.height - 18;
}

/** Lowest Y a section may draw at before it has to break to a new page. */
export function contentBottomLimit(doc: jsPDF): number {
  return footerRuleY(doc) - 6;
}

function drawPageFooter(ctx: PdfPageContext, pageNum: number, totalPages: number): void {
  const { doc, patientName, reportDate } = ctx;
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;

  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.2);
  doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_COLORS.textMuted);
  doc.text(`${patientName} · Report generated ${reportDate}`, 14, pageHeight - 12);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 14, pageHeight - 12, {
    align: 'right',
  });
}

/**
 * Stamps every footer in one pass, after all content is laid out.
 *
 * Footers used to be drawn inline against a total estimated up front by `countReportPages`,
 * which assumed one page per section. The executive summary can now flow onto extra pages, so
 * any such estimate would be wrong — and "Page 3 of 6" on a seven-page clinical document is the
 * kind of error that makes a provider distrust the rest of it. Reading the total from the
 * document after the fact cannot drift.
 */
export function stampAllPageFooters(ctx: PdfPageContext): void {
  const { doc } = ctx;
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    drawPageFooter(ctx, page, totalPages);
  }
  ctx.totalPages = totalPages;
}

export function addNewPage(ctx: PdfPageContext): void {
  ctx.doc.addPage();
  ctx.pageNum += 1;
}

export function drawSectionHeader(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(title, 14, y);
  doc.setFont('helvetica', 'normal');
  return y + 8;
}

export function drawSubheader(doc: jsPDF, text: string, y: number): number {
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.textMuted);
  const lines = doc.splitTextToSize(text, 180);
  doc.text(lines, 14, y);
  return y + lines.length * 4 + 4;
}

export function trendArrow(current: number, prior: number | undefined): string {
  if (prior === undefined) return '→';
  const diff = current - prior;
  if (Math.abs(diff) < 0.25) return '→';
  return diff > 0 ? '↑' : '↓';
}

export function trendLabel(current: number, prior: number | undefined): string {
  if (prior === undefined) return 'stable';
  const diff = current - prior;
  if (Math.abs(diff) < 0.25) return 'stable';
  return diff > 0 ? 'worsening' : 'improving';
}
