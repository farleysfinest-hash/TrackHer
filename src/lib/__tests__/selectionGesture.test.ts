import { beforeEach, describe, expect, it, vi } from 'vitest';

const selectionGestureStart = vi.fn(() => Promise.resolve(true));
const selectionGestureChanged = vi.fn(() => Promise.resolve(true));
const selectionGestureEnd = vi.fn(() => Promise.resolve(true));
const selectionTick = vi.fn(() => Promise.resolve(true));

vi.mock('../haptics', () => ({
  selectionGestureStart: () => selectionGestureStart(),
  selectionGestureChanged: () => selectionGestureChanged(),
  selectionGestureEnd: () => selectionGestureEnd(),
  selectionTick: () => selectionTick(),
}));

const {
  beginSelectionGesture,
  endSelectionGesture,
  selectionFeedback,
  isSelectionGestureActive,
} = await import('../selectionGesture');

describe('selection gesture state machine', () => {
  beforeEach(() => {
    endSelectionGesture();
    vi.clearAllMocks();
  });

  it('prepares the generator once per drag, not once per tick', () => {
    beginSelectionGesture();
    selectionFeedback();
    selectionFeedback();
    selectionFeedback();
    endSelectionGesture();

    // The bug this replaces fired start+changed+end for every one of the three
    // ticks — nine bridge calls and a generator torn down between each.
    expect(selectionGestureStart).toHaveBeenCalledTimes(1);
    expect(selectionGestureChanged).toHaveBeenCalledTimes(3);
    expect(selectionGestureEnd).toHaveBeenCalledTimes(1);
    expect(selectionTick).not.toHaveBeenCalled();
  });

  it('uses a self-contained bracketed tick outside a drag', () => {
    selectionFeedback();

    expect(selectionTick).toHaveBeenCalledTimes(1);
    expect(selectionGestureStart).not.toHaveBeenCalled();
    expect(selectionGestureChanged).not.toHaveBeenCalled();
  });

  it('ignores a second begin while a gesture is already open', () => {
    beginSelectionGesture();
    beginSelectionGesture();

    expect(selectionGestureStart).toHaveBeenCalledTimes(1);
    expect(isSelectionGestureActive()).toBe(true);
  });

  it('is idempotent on end, so unmount cleanup cannot double-release', () => {
    beginSelectionGesture();
    endSelectionGesture();
    endSelectionGesture();

    expect(selectionGestureEnd).toHaveBeenCalledTimes(1);
    expect(isSelectionGestureActive()).toBe(false);
  });

  it('returns to bracketed ticks once the drag ends', () => {
    beginSelectionGesture();
    selectionFeedback();
    endSelectionGesture();
    selectionFeedback();

    expect(selectionGestureChanged).toHaveBeenCalledTimes(1);
    expect(selectionTick).toHaveBeenCalledTimes(1);
  });
});
