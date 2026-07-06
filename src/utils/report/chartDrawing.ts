import type jsPDF from 'jspdf';
import { PDF_COLORS } from './pdfTheme';

export interface ChartPoint {
  date: string;
  value: number;
  label: string;
}

export interface ChartMarker {
  date: string;
  label: string;
}

export interface LineSeries {
  points: ChartPoint[];
  color?: [number, number, number];
  dashed?: boolean;
  label?: string;
}

export function drawLineChart(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  series: LineSeries[],
  yMin: number,
  yMax: number,
  markers: ChartMarker[] = [],
): void {
  const chartBottom = y + height;
  const chartRight = x + width;

  doc.setDrawColor(PDF_COLORS.border[0], PDF_COLORS.border[1], PDF_COLORS.border[2]);
  doc.setLineWidth(0.3);
  doc.rect(x, y, width, height);

  doc.setFontSize(7);
  doc.setTextColor(PDF_COLORS.textMuted[0], PDF_COLORS.textMuted[1], PDF_COLORS.textMuted[2]);

  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const value = yMin + ((yMax - yMin) * i) / yTicks;
    const py = chartBottom - (height * i) / yTicks;
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.1);
    doc.line(x, py, chartRight, py);
    doc.setTextColor(PDF_COLORS.textMuted[0], PDF_COLORS.textMuted[1], PDF_COLORS.textMuted[2]);
    doc.text(String(Math.round(value)), x - 2, py + 1, { align: 'right' });
  }

  const primary = series[0];
  if (!primary || primary.points.length === 0) {
    doc.setFontSize(8);
    doc.setTextColor(PDF_COLORS.textMuted[0], PDF_COLORS.textMuted[1], PDF_COLORS.textMuted[2]);
    doc.text('Insufficient data for trend chart', x + width / 2, y + height / 2, {
      align: 'center',
    });
    return;
  }

  const dates = primary.points.map((p) => p.date);
  const dateToX = (date: string) => {
    if (dates.length === 1) return x + width / 2;
    const idx = dates.indexOf(date);
    return x + (width * idx) / (dates.length - 1);
  };
  const valueToY = (value: number) =>
    chartBottom - ((value - yMin) / Math.max(yMax - yMin, 1)) * height;

  for (const marker of markers) {
    const mx = dateToX(marker.date);
    if (mx < x || mx > chartRight) continue;
    doc.setDrawColor(PDF_COLORS.marker[0], PDF_COLORS.marker[1], PDF_COLORS.marker[2]);
    doc.setLineWidth(0.4);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(mx, y, mx, chartBottom);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(6);
    doc.text(marker.label, mx, y - 2, { align: 'center', maxWidth: 30 });
  }

  for (const s of series) {
    if (s.points.length === 0) continue;
    const color = s.color ?? PDF_COLORS.chartLine;
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(s.dashed ? 0.4 : 0.8);
    if (s.dashed) doc.setLineDashPattern([3, 2], 0);

    for (let i = 1; i < s.points.length; i++) {
      const p0 = s.points[i - 1];
      const p1 = s.points[i];
      doc.line(dateToX(p0.date), valueToY(p0.value), dateToX(p1.date), valueToY(p1.value));
    }

    doc.setFillColor(color[0], color[1], color[2]);
    for (const p of s.points) {
      const px = dateToX(p.date);
      const py = valueToY(p.value);
      doc.circle(px, py, s.dashed ? 1 : 1.5, 'F');
    }

    doc.setLineDashPattern([], 0);
  }

  const labelStep = Math.max(1, Math.ceil(dates.length / 6));
  doc.setFontSize(6);
  doc.setTextColor(PDF_COLORS.textMuted[0], PDF_COLORS.textMuted[1], PDF_COLORS.textMuted[2]);
  dates.forEach((date, i) => {
    if (i % labelStep !== 0 && i !== dates.length - 1) return;
    const parts = date.split('-');
    const short = `${parts[1]}/${parts[2]}`;
    doc.text(short, dateToX(date), chartBottom + 5, { align: 'center' });
  });

  doc.setFontSize(7);
  doc.text('Date', x + width / 2, chartBottom + 12, { align: 'center' });
  doc.text('Score', x - 10, y + height / 2, { angle: 90 });
}
