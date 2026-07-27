import { describe, expect, it } from 'vitest';
import {
  buildCombinedCsv,
  escapeCsvCell,
  rowsToCsv,
  type ExportBundle,
} from '../dataExport';

describe('escapeCsvCell', () => {
  it('prefixes formula-injection prefixes so Excel will not execute them', () => {
    expect(escapeCsvCell('=1+1')).toBe("'=1+1");
    expect(escapeCsvCell('+cmd')).toBe("'+cmd");
    expect(escapeCsvCell('-2')).toBe("'-2");
    expect(escapeCsvCell('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('quotes fields that contain commas or quotes', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it('leaves ordinary notes alone', () => {
    expect(escapeCsvCell('mild cramps')).toBe('mild cramps');
  });
});

describe('rowsToCsv / buildCombinedCsv', () => {
  it('emits a header and one row', () => {
    expect(rowsToCsv([{ a: 1, note: '=cmd' }])).toBe("a,note\n1,'=cmd");
  });

  it('tags each section with a table column', () => {
    const data = {
      symptom_checkins: [{ id: 'c1', note: '=hack' }],
      medications: [{ id: 'm1', name: 'Estradiol' }],
      medication_administrations: [],
      lab_results: [],
      quick_log_events: [],
      extended_symptom_logs: [],
    } as unknown as ExportBundle;

    const csv = buildCombinedCsv(data);
    expect(csv).toContain('table,id,note');
    expect(csv).toContain("symptom_checkins,c1,'=hack");
    expect(csv).toContain('medications,m1,Estradiol');
  });
});
