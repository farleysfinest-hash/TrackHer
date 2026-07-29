/** Dose watch companion note — client clamp matching Edge dose_watch. */

export interface DoseWatchPack {
  note: string;
  watchFor: string[];
}

export function clampDoseWatchPack(raw: unknown): DoseWatchPack | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const note = typeof o.note === 'string' ? o.note.trim().slice(0, 500) : '';
  if (!note) return null;
  const watchFor = Array.isArray(o.watchFor)
    ? o.watchFor
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim().slice(0, 160))
        .slice(0, 4)
    : [];
  return { note, watchFor };
}

/** Stable cache hash fragment: change date + med name. */
export function doseWatchCacheKey(changeDate: string, medicationName: string): string {
  return `dose_watch:${changeDate}:${medicationName.trim().toLowerCase()}`;
}
