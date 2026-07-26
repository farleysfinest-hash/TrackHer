import { describe, expect, it } from 'vitest';
import jsPDF from 'jspdf';
import type { PdfPageContext } from '../report/pdfTheme';
import { stampAllPageFooters, contentBottomLimit } from '../report/pdfTheme';

/**
 * The executive summary used to accumulate `y` across every insight with no bounds check, so a
 * few long bodies wrote past the footer and off the page. Because the whole point is what lands
 * on the page, these assert against jsPDF's own text placement rather than a return value.
 */
function makeCtx(): PdfPageContext {
  return {
    doc: new jsPDF(),
    patientName: 'Test Patient',
    reportDate: '26 July 2026',
    pageNum: 1,
    totalPages: 0,
  };
}

/**
 * Y of every text item jsPDF actually committed, per page, in the same mm-from-top units the
 * layout code uses.
 *
 * The emitted stream is in PDF points with a bottom-left origin, so a raw `Td` value has to be
 * flipped and divided by the scale factor before it can be compared against `contentBottomLimit`.
 */
function textYsByPage(doc: jsPDF): number[][] {
  const internal = doc.internal as unknown as {
    pages: string[][];
    scaleFactor: number;
  };
  const pageHeightMm = doc.internal.pageSize.height;
  const pageHeightPt = pageHeightMm * internal.scaleFactor;

  const pages: number[][] = [];
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    const content = (internal.pages[page] ?? []).join('\n');
    const ys: number[] = [];
    // jsPDF emits text as `x y Td (...) Tj` inside BT/ET blocks.
    for (const match of content.matchAll(/([\d.]+)\s+([\d.]+)\s+Td/g)) {
      ys.push((pageHeightPt - Number(match[2])) / internal.scaleFactor);
    }
    pages.push(ys);
  }
  return pages;
}

describe('provider report pagination', () => {
  it('stamps every page with the real total, not an estimate', () => {
    const ctx = makeCtx();
    ctx.doc.addPage();
    ctx.doc.addPage();

    stampAllPageFooters(ctx);

    expect(ctx.doc.getNumberOfPages()).toBe(3);
    expect(ctx.totalPages).toBe(3);
  });

  it('leaves the content area clear of the footer rule', () => {
    const doc = new jsPDF();
    // Content must stop above the footer rule, with margin — otherwise body text collides with
    // the "Page X of Y" line rather than flowing to the next page.
    expect(contentBottomLimit(doc)).toBeLessThan(doc.internal.pageSize.height - 18);
  });

  it('breaks to a new page rather than writing past the footer', async () => {
    const { renderInsightBlock } = await import('../report/sections/executiveSummary');

    const ctx = makeCtx();
    const limit = contentBottomLimit(ctx.doc);

    const longInsight = (n: number) =>
      ({
        id: `i-${n}`,
        title: `Insight ${n} — a title long enough to wrap across more than a single line`,
        body: Array.from(
          { length: 18 },
          (_, i) => `Sentence ${i + 1} of a deliberately long insight body that has to wrap.`,
        ).join(' '),
        sampleSize: { n: 12 },
        generatedAt: '2026-07-26T00:00:00.000Z',
      }) as never;

    let y = 18;
    for (let n = 1; n <= 8; n++) {
      y = renderInsightBlock(ctx, longInsight(n), y, 'UTC');
    }

    // Eight bodies of this size comfortably exceed one A4 page. Before the fix every one of them
    // was written to page 1, the later ones below the footer and off the sheet.
    expect(ctx.doc.getNumberOfPages()).toBeGreaterThan(1);

    for (const ys of textYsByPage(ctx.doc)) {
      for (const drawnY of ys) {
        expect(drawnY).toBeLessThanOrEqual(limit + 1);
      }
    }
  });

  it('resets to the top of the page after a break', async () => {
    const { renderInsightBlock } = await import('../report/sections/executiveSummary');

    const ctx = makeCtx();
    const insight = {
      id: 'i',
      title: 'Short title',
      body: 'Short body.',
      sampleSize: { n: 3 },
      generatedAt: '2026-07-26T00:00:00.000Z',
    } as never;

    // Start near the bottom so the very first block has to break.
    const y = renderInsightBlock(ctx, insight, contentBottomLimit(ctx.doc) - 2, 'UTC');

    expect(ctx.doc.getNumberOfPages()).toBe(2);
    expect(y).toBeLessThan(60);
  });
});
