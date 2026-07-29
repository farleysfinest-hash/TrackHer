/** Daily companion one-liner helpers. */

export function clampDailyLine(text: unknown): string | null {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  return trimmed.slice(0, 140);
}

export function dailyLineCacheKey(localDate: string, factsHash: string): string {
  return `${localDate}:${factsHash}`;
}

export function shouldSkipDailyLine(opts: {
  mrsCount: number;
  pulseCount: number;
  medCount: number;
}): boolean {
  return opts.mrsCount < 1 && opts.pulseCount < 1 && opts.medCount < 1;
}
