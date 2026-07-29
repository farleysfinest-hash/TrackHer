/** Visit prep pack — client-side clamp matching Edge validation. */

export interface VisitPrepPack {
  summary: string;
  symptomsToRaise: string[];
  questions: string[];
  watchSince: string | null;
}

export function clampVisitPrepPack(raw: unknown): VisitPrepPack | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const summary = typeof o.summary === 'string' ? o.summary.trim().slice(0, 800) : '';
  if (!summary) return null;

  const symptomsToRaise = Array.isArray(o.symptomsToRaise)
    ? o.symptomsToRaise
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim().slice(0, 240))
        .slice(0, 5)
    : [];

  const questions = Array.isArray(o.questions)
    ? o.questions
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim().slice(0, 240))
        .slice(0, 4)
    : [];

  const watchSince =
    typeof o.watchSince === 'string' && o.watchSince.trim()
      ? o.watchSince.trim().slice(0, 240)
      : null;

  return { summary, symptomsToRaise, questions, watchSince };
}

export function formatVisitPrepForCopy(pack: VisitPrepPack): string {
  const lines: string[] = [pack.summary, ''];
  if (pack.symptomsToRaise.length > 0) {
    lines.push('Symptoms to raise:');
    for (const s of pack.symptomsToRaise) lines.push(`• ${s}`);
    lines.push('');
  }
  if (pack.questions.length > 0) {
    lines.push('Questions for my clinician:');
    for (const q of pack.questions) lines.push(`• ${q}`);
    lines.push('');
  }
  if (pack.watchSince) {
    lines.push(`Watch since: ${pack.watchSince}`);
  }
  return lines.join('\n').trim();
}
