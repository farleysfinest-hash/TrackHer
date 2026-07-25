import {
  selectionGestureChanged,
  selectionGestureEnd,
  selectionGestureStart,
  selectionTick,
} from './haptics';

/**
 * Owns the selection-haptic state machine so callers never have to know whether
 * a change came from a drag or a single tap.
 *
 * A drag brackets the whole gesture once (prepare -> many ticks -> release).
 * A tap or an arrow key outside a drag gets a self-contained bracketed tick.
 *
 * Module-level state is correct here: iOS has one selection feedback generator,
 * pointer capture means only one scrub region can own the pointer at a time,
 * and a second begin while one is active is ignored rather than stacked.
 */
let gestureActive = false;

export function beginSelectionGesture(): void {
  if (gestureActive) return;
  gestureActive = true;
  void selectionGestureStart();
}

export function endSelectionGesture(): void {
  if (!gestureActive) return;
  gestureActive = false;
  void selectionGestureEnd();
}

/** Fires the right flavour of feedback for the context we are currently in. */
export function selectionFeedback(): void {
  if (gestureActive) {
    void selectionGestureChanged();
    return;
  }
  void selectionTick();
}

/** Test seam — no production caller should need this. */
export function isSelectionGestureActive(): boolean {
  return gestureActive;
}
