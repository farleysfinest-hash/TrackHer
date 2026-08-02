import { describe, expect, it } from 'vitest';
import { FOCUSABLE_SELECTOR } from '../focusTrap';

describe('focus trap selector', () => {
  it('excludes disabled textareas and inputs from the focus cycle', () => {
    expect(FOCUSABLE_SELECTOR).toContain('textarea:not([disabled])');
    expect(FOCUSABLE_SELECTOR).toContain('input:not([disabled])');
    expect(FOCUSABLE_SELECTOR).toContain('select:not([disabled])');
    expect(FOCUSABLE_SELECTOR).not.toContain(', textarea,');
    expect(FOCUSABLE_SELECTOR).not.toContain(', input,');
  });
});
