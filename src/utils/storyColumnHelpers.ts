import type { Insight } from '../engine/types';
import type { MedicationChange, SymptomCheckin } from '../types/database';
import { formatChartDateLong } from './chartHelpers';
import { getDailySignal } from './checkinHelpers';

export type PulseChannel = 'energy' | 'mood' | 'sleep';

const CHANNEL_LABELS: Record<PulseChannel, string> = {
  energy: 'Energy',
  mood: 'Mood',
  sleep: 'Sleep',
};

const WINDOW_DAYS = 21;
const MIN_POINTS = 5;
const MIN_DIFF = 1;

function addDaysISO(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${month}-${day}`;
}

export function getPulseChannelValue(
  checkin: SymptomCheckin,
  channel: PulseChannel,
): number | null {
  if (channel === 'energy') return getDailySignal(checkin);
  if (channel === 'mood') {
    return checkin.mood_level !== null && checkin.mood_level !== undefined
      ? checkin.mood_level
      : null;
  }
  return checkin.sleep_quality !== null && checkin.sleep_quality !== undefined
    ? checkin.sleep_quality
    : null;
}

function channelSeries(checkins: SymptomCheckin[], channel: PulseChannel) {
  return checkins
    .map((c) => {
      const value = getPulseChannelValue(c, channel);
      return value !== null ? { date: c.checkin_date, value } : null;
    })
    .filter((p): p is { date: string; value: number } => p !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function detectStrongestRespondingChannel(
  checkins: SymptomCheckin[],
  change: MedicationChange,
): PulseChannel {
  let best: { channel: PulseChannel; diff: number } = { channel: 'energy', diff: 0 };

  for (const channel of ['energy', 'mood', 'sleep'] as PulseChannel[]) {
    const points = channelSeries(checkins, channel);
    if (points.length < 2) continue;

    const beforeStart = addDaysISO(change.change_date, -WINDOW_DAYS);
    const afterEnd = addDaysISO(change.change_date, WINDOW_DAYS);
    const before = points.filter((p) => p.date >= beforeStart && p.date < change.change_date);
    const after = points.filter((p) => p.date > change.change_date && p.date <= afterEnd);
    if (before.length < MIN_POINTS || after.length < MIN_POINTS) continue;

    const avgBefore = before.reduce((s, p) => s + p.value, 0) / before.length;
    const avgAfter = after.reduce((s, p) => s + p.value, 0) / after.length;
    const diff = Math.abs(avgAfter - avgBefore);
    if (diff > best.diff) best = { channel, diff };
  }

  return best.diff >= MIN_DIFF ? best.channel : 'energy';
}

export function resolvePulsePanelDefaults(
  insights: Insight[],
  checkins: SymptomCheckin[],
  changes: MedicationChange[],
): { channel: PulseChannel; header: string } {
  const doseInsight = [...insights]
    .filter((i) => i.category === 'wellbeing_signal' && i.id.startsWith('wb-dose-'))
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];

  if (doseInsight) {
    const changeId = doseInsight.id.replace('wb-dose-', '');
    const change = changes.find((c) => c.id === changeId);
    if (change) {
      const channel = detectStrongestRespondingChannel(checkins, change);
      const label = CHANNEL_LABELS[channel];
      const dateLabel = formatChartDateLong(change.change_date);
      return {
        channel,
        header: `${label} — strongest response to your ${dateLabel} change`,
      };
    }
  }

  return {
    channel: 'energy',
    header: 'Energy · daily pulse',
  };
}

export const PULSE_CHANNELS: Array<{ id: PulseChannel; label: string }> = [
  { id: 'energy', label: 'Energy' },
  { id: 'mood', label: 'Mood' },
  { id: 'sleep', label: 'Sleep' },
];
