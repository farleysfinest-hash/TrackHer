/** Journal extract — client clamp matching Edge journal_extract validation. */

export type JournalRiskTier =
  | 'mental_decline'
  | 'crisis'
  | 'crisis_imminent'
  | 'loved_one';

export interface JournalSymptomSuggestion {
  key: string;
  label: string;
  reason: string;
}

export interface JournalEventSuggestion {
  type: 'missed_dose' | 'note';
  medicationName: string | null;
  note: string;
}

export interface JournalExtractResult {
  symptoms: JournalSymptomSuggestion[];
  events: JournalEventSuggestion[];
  followUpQuestions: string[];
  risk?: JournalRiskTier | null;
  riskReply?: string | null;
}

function parseRisk(raw: unknown): JournalRiskTier | null {
  return raw === 'mental_decline' ||
    raw === 'crisis' ||
    raw === 'crisis_imminent' ||
    raw === 'loved_one'
    ? raw
    : null;
}

export function clampJournalExtract(
  raw: unknown,
  allowedKeys: ReadonlySet<string> | Map<string, string>,
  allowedMedNames: ReadonlySet<string>,
): JournalExtractResult {
  const labelFor = (key: string, fallback?: string): string => {
    if (allowedKeys instanceof Map) return allowedKeys.get(key) ?? fallback ?? key;
    return fallback ?? key;
  };
  const hasKey = (key: string) =>
    allowedKeys instanceof Map ? allowedKeys.has(key) : allowedKeys.has(key);

  if (!raw || typeof raw !== 'object') {
    return { symptoms: [], events: [], followUpQuestions: [], risk: null, riskReply: null };
  }
  const o = raw as Record<string, unknown>;
  const risk = parseRisk(o.risk);
  const riskReply =
    typeof o.riskReply === 'string' && o.riskReply.trim()
      ? o.riskReply.trim().slice(0, 2000)
      : null;

  if (risk && riskReply) {
    return { symptoms: [], events: [], followUpQuestions: [], risk, riskReply };
  }

  const symptoms = Array.isArray(o.symptoms)
    ? o.symptoms
        .filter(
          (s): s is { key: string; label?: string; reason?: string } =>
            !!s &&
            typeof s === 'object' &&
            typeof (s as { key?: unknown }).key === 'string',
        )
        .filter((s) => hasKey(s.key))
        .slice(0, 6)
        .map((s) => ({
          key: s.key,
          label: labelFor(s.key, typeof s.label === 'string' ? s.label : undefined),
          reason: typeof s.reason === 'string' ? s.reason.slice(0, 160) : '',
        }))
    : [];

  const events = Array.isArray(o.events)
    ? o.events
        .filter(
          (e): e is { type?: unknown; medicationName?: unknown; note?: unknown } =>
            !!e && typeof e === 'object',
        )
        .map((e) => {
          const type = e.type === 'missed_dose' || e.type === 'note' ? e.type : null;
          if (!type) return null;
          const rawName =
            typeof e.medicationName === 'string' && e.medicationName.trim()
              ? e.medicationName.trim()
              : null;
          const medicationName =
            rawName && allowedMedNames.has(rawName) ? rawName : null;
          const note =
            typeof e.note === 'string' && e.note.trim()
              ? e.note.trim().slice(0, 240)
              : type === 'missed_dose'
                ? 'Missed dose'
                : '';
          if (!note && type === 'note') return null;
          return { type, medicationName, note };
        })
        .filter((e): e is JournalEventSuggestion => e !== null)
        .slice(0, 3)
    : [];

  const followUpQuestions = Array.isArray(o.followUpQuestions)
    ? o.followUpQuestions
        .filter((question): question is string => typeof question === 'string')
        .map((question) => question.trim().slice(0, 180))
        .filter(Boolean)
        .slice(0, 2)
    : [];

  return { symptoms, events, followUpQuestions, risk: null, riskReply: null };
}
