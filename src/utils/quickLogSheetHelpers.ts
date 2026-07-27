import { dateISOInTimeZone } from '../utils/localDate';

export type QuickLogTimeOptionId = 'now' | '30min' | `hours_${number}`;

export type QuickLogTimeOption = {
  id: QuickLogTimeOptionId;
  label: string;
  getIso: () => string;
};

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function applyDragResistance(deltaY: number): number {
  if (deltaY <= 0) return 0;
  return deltaY / (1 + deltaY / 450);
}

export function buildQuickLogTimeOptions(timezone: string): QuickLogTimeOption[] {
  const now = new Date();
  const options: QuickLogTimeOption[] = [
    { id: 'now', label: 'Just now', getIso: () => new Date().toISOString() },
    {
      id: '30min',
      label: '30 min ago',
      getIso: () => new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
  ];
  for (let hours = 1; hours <= 12; hours++) {
    const past = new Date(now.getTime() - hours * 60 * 60 * 1000);
    if (dateISOInTimeZone(past, timezone) !== dateISOInTimeZone(now, timezone)) break;
    options.push({
      id: `hours_${hours}`,
      label: hours === 1 ? '1 hour ago' : `${hours} hours ago`,
      getIso: () => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
    });
  }
  return options;
}

export function resolveQuickLogLoggedAt(
  timeId: QuickLogTimeOptionId,
  timeOptions: QuickLogTimeOption[],
): string {
  const opt = timeOptions.find((o) => o.id === timeId);
  return opt ? opt.getIso() : new Date().toISOString();
}
