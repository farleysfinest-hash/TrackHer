/**
 * Step transitions for the delete-account flow, kept separate from the component so the
 * invariant can be tested without a DOM.
 *
 * This exists because the transition was previously inline in a `useEffect` with `step` in its
 * dependency array. Advancing to 'confirm' changed a dependency, re-ran the effect while
 * `isOpen` was still true, and reset the flow to 'warning' — the typed-DELETE step was
 * unreachable and account deletion could not be completed at all.
 */
export type DeleteAccountStep = 'warning' | 'confirm' | 'deleted' | null;

/**
 * Resolves the step when the modal's open state changes.
 *
 * Opening always restarts at the first warning. Closing clears the flow, except from 'deleted' —
 * the success screen is shown *after* the account is gone, so it must survive the parent
 * dropping `isOpen`.
 *
 * Note this is only for open-state changes. Advancing within an open modal is driven by user
 * action and must never be recomputed from `isOpen`.
 */
export function resolveStepForOpenChange(
  isOpen: boolean,
  previous: DeleteAccountStep,
): DeleteAccountStep {
  if (isOpen) return 'warning';
  return previous === 'deleted' ? 'deleted' : null;
}
