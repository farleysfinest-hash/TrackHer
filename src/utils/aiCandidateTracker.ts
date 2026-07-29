/** Stable hash of an AI-noticed candidate title for promotion tracking. */

export function hashAiCandidateTitle(title: string): string {
  const s = title.trim().toLowerCase();
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export type AiCandidateEventAction = 'shown' | 'dismissed' | 'opened';

export function isAiCandidateEventAction(value: string): value is AiCandidateEventAction {
  return value === 'shown' || value === 'dismissed' || value === 'opened';
}
