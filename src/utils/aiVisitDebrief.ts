/** Visit debrief — client clamp matching Edge visit_debrief. */

export interface VisitDebriefFollowUp {
  label: string;
  timeframe: string | null;
  done?: boolean;
}

export interface VisitDebriefPack {
  planSummary: string;
  followUps: VisitDebriefFollowUp[];
  savedAt?: string;
}

export const VISIT_DEBRIEF_STORAGE_KEY = 'trackher.visitDebrief.v1';

export function clampVisitDebriefPack(raw: unknown): VisitDebriefPack | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const planSummary =
    typeof o.planSummary === 'string' ? o.planSummary.trim().slice(0, 1200) : '';
  if (!planSummary) return null;
  const followUps = Array.isArray(o.followUps)
    ? o.followUps
        .filter(
          (f): f is { label?: unknown; timeframe?: unknown; done?: unknown } =>
            !!f && typeof f === 'object',
        )
        .map((f) => {
          const label =
            typeof f.label === 'string' && f.label.trim()
              ? f.label.trim().slice(0, 200)
              : '';
          if (!label) return null;
          const timeframe =
            typeof f.timeframe === 'string' && f.timeframe.trim()
              ? f.timeframe.trim().slice(0, 80)
              : null;
          return {
            label,
            timeframe,
            done: f.done === true,
          };
        })
        .filter((f): f is VisitDebriefFollowUp => f !== null)
        .slice(0, 5)
    : [];
  return {
    planSummary,
    followUps,
    savedAt: typeof o.savedAt === 'string' ? o.savedAt : undefined,
  };
}

export function readVisitDebriefFromStorage(): VisitDebriefPack | null {
  try {
    const raw = localStorage.getItem(VISIT_DEBRIEF_STORAGE_KEY);
    if (!raw) return null;
    return clampVisitDebriefPack(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeVisitDebriefToStorage(pack: VisitDebriefPack): void {
  try {
    localStorage.setItem(
      VISIT_DEBRIEF_STORAGE_KEY,
      JSON.stringify({ ...pack, savedAt: pack.savedAt ?? new Date().toISOString() }),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function clearVisitDebriefStorage(): void {
  try {
    localStorage.removeItem(VISIT_DEBRIEF_STORAGE_KEY);
  } catch {
    // ignore
  }
}
