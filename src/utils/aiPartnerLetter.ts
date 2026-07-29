/** Partner letter helpers. */

export function clampPartnerLetter(text: unknown): string | null {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 6000);
}

export function partnerLetterCacheKey(factsHash: string, freeText: string): string {
  const extra = freeText.trim().toLowerCase().slice(0, 200);
  let h = 2166136261;
  for (let i = 0; i < extra.length; i++) {
    h ^= extra.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${factsHash}:${(h >>> 0).toString(16)}`;
}
