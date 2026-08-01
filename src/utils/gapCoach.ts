/** Rule: active meds present and fewer than `minMrs` complete weekly check-ins. */
export function buildGapCoachMessage(
  activeMedCount: number,
  mrsCheckinCount: number,
  minMrs = 3,
): string | null {
  if (activeMedCount <= 0) return null;
  if (mrsCheckinCount >= minMrs) return null;
  if (mrsCheckinCount === 0) {
    return `You're already tracking medication — a few weekly check-ins will help Luna and your pattern insights reflect how you're actually feeling alongside those doses.`;
  }
  return `You've logged medication and ${mrsCheckinCount} weekly check-in${mrsCheckinCount === 1 ? '' : 's'}. A couple more weeks of scores will make trends much clearer — no rush, just whenever you can.`;
}
