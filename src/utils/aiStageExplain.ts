/** Stage explain helpers. */

export function clampStageExplain(text: unknown): string | null {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  // Soft cap ~5 sentences / ~1200 chars
  return trimmed.slice(0, 1200);
}

export function stageExplainCacheKey(stage: string): string {
  return `stage:${stage.trim().toLowerCase() || 'unknown'}`;
}
