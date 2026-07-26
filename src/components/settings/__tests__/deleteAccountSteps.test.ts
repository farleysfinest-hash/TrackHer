import { describe, expect, it } from 'vitest';
import { resolveStepForOpenChange } from '../deleteAccountSteps';

describe('resolveStepForOpenChange', () => {
  it('starts at the first warning when the modal opens', () => {
    expect(resolveStepForOpenChange(true, null)).toBe('warning');
  });

  it('clears the flow when the modal closes', () => {
    expect(resolveStepForOpenChange(false, 'warning')).toBeNull();
    expect(resolveStepForOpenChange(false, 'confirm')).toBeNull();
  });

  it('keeps the success screen after the parent closes the modal', () => {
    // The account is already gone by this point; dropping to null would strip the only
    // confirmation the user ever sees.
    expect(resolveStepForOpenChange(false, 'deleted')).toBe('deleted');
  });

  it('is idempotent while the modal stays open', () => {
    // The regression: this function is applied on open-state change, so re-applying it must not
    // walk a user who has reached 'confirm' back to 'warning'. The effect previously re-ran on
    // every step change and did exactly that, making account deletion impossible to complete.
    const afterOpen = resolveStepForOpenChange(true, null);
    expect(resolveStepForOpenChange(true, afterOpen)).toBe('warning');
  });

  it('resets a reopened modal that had been left on the confirm step', () => {
    expect(resolveStepForOpenChange(true, 'confirm')).toBe('warning');
  });
});
