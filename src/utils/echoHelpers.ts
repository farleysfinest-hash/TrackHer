import type { QuickLogEvent, QuickLogTriggerTag } from '../types/database';
import { getSymptomByKey } from '../data/symptoms';

const TRIGGER_LABELS: Record<QuickLogTriggerTag, string> = {
  stress: 'stress',
  food: 'food',
  exercise: 'exercise',
  heat: 'heat',
  poor_sleep: 'poor sleep',
  missed_dose: 'missed dose',
  alcohol: 'alcohol',
  caffeine: 'caffeine',
  unknown: 'unknown',
  other: 'other',
};

type TimeBlock = 'morning' | 'afternoon' | 'evening' | 'night';

const BLOCK_LABELS: Record<TimeBlock, string> = {
  morning: 'morning',
  afternoon: 'afternoon',
  evening: 'evening',
  night: 'night',
};

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

function eventsInLastDays(events: QuickLogEvent[], days: number): QuickLogEvent[] {
  return events.filter((e) => daysSince(e.logged_at) <= days);
}

function getTimeBlock(iso: string): TimeBlock {
  const h = new Date(iso).getHours();
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  if (h >= 18) return 'evening';
  return 'night';
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function buildQuickLogEcho(
  newEvent: QuickLogEvent,
  recentEvents: QuickLogEvent[],
): string {
  const symptom = getSymptomByKey(newEvent.symptom_id);
  const label = symptom?.label ?? newEvent.symptom_id;

  const priorSameSymptom = recentEvents.filter(
    (e) => e.symptom_id === newEvent.symptom_id && e.id !== newEvent.id,
  );

  if (priorSameSymptom.length === 0) {
    return `Logged — your first data point for ${label}.`;
  }

  const last14 = eventsInLastDays(
    [...priorSameSymptom, newEvent],
    14,
  ).filter((e) => e.symptom_id === newEvent.symptom_id);

  if (newEvent.trigger_tag) {
    const withTrigger = last14.filter((e) => e.trigger_tag === newEvent.trigger_tag);
    if (withTrigger.length >= 2) {
      const triggerLabel = TRIGGER_LABELS[newEvent.trigger_tag] ?? newEvent.trigger_tag;
      return `Logged — ${withTrigger.length} ${label} events tagged ${triggerLabel} recently.`;
    }
  }

  if (last14.length >= 3) {
    const block = getTimeBlock(newEvent.logged_at);
    const inBlock = last14.filter((e) => getTimeBlock(e.logged_at) === block);
    if (inBlock.length / last14.length >= 0.7) {
      return `Logged — your ${label} events keep landing in the ${BLOCK_LABELS[block]}.`;
    }
  }

  const last7 = eventsInLastDays([...priorSameSymptom, newEvent], 7).filter(
    (e) => e.symptom_id === newEvent.symptom_id,
  );
  if (last7.length >= 2) {
    return `Logged — ${ordinal(last7.length)} ${label} event this week.`;
  }

  return 'Logged.';
}

export const UROGENITAL_NORMALIZATION_COPY =
  'These are among the most under-reported — and most treatable — symptoms on this list. Over half of postmenopausal women experience them.';
