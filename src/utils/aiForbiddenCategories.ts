import type { InsightCategory } from '../engine/types';

/** Categories the companion must never polish, rewrite, or propose candidates about. */
export const AI_FORBIDDEN_CATEGORIES: ReadonlySet<InsightCategory> = new Set([
  'safeguarding',
  'psych_trajectory',
  'cardiac_persistence',
  'bleeding_red_flag',
]);

export function isAiForbiddenCategory(category: InsightCategory | string): boolean {
  return AI_FORBIDDEN_CATEGORIES.has(category as InsightCategory);
}
