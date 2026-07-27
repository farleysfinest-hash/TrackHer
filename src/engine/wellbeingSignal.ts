import type { Insight } from './types';
import { addDaysISO, todayISO } from '../utils/localDate';
import {
  type WellbeingSignalInput,
  WINDOW_DAYS,
  dailySignalSeries,
} from './wellbeingShared';
import { doseChangeWellbeingInsights } from './wellbeingDoseEffect';
import { moodVolatilityInsight, volatilityInsight } from './wellbeingVolatility';
import { troughInsights } from './wellbeingTrough';
import { dipTripwire } from './wellbeingDip';

export type { WellbeingSignalInput } from './wellbeingShared';

function hasPostChangeWindowOpen(
  medicationChanges: WellbeingSignalInput['medicationChanges'],
  today: string,
): boolean {
  return medicationChanges.some((c) => {
    const end = addDaysISO(c.change_date, WINDOW_DAYS);
    return today > c.change_date && today <= end;
  });
}

export function analyzeWellbeingSignal(input: WellbeingSignalInput): Insight[] {
  const doseInsights = doseChangeWellbeingInsights(input);

  const today =
    dailySignalSeries(input.checkins).slice(-1)[0]?.date ?? todayISO(input.timezone);

  const suppressForDoseWindow =
    hasPostChangeWindowOpen(input.medicationChanges, today) || doseInsights.length > 0;

  const moodVolatility = moodVolatilityInsight(input, suppressForDoseWindow);
  const energyVolatility = volatilityInsight(input, suppressForDoseWindow);
  const volatility = moodVolatility.length > 0 ? moodVolatility : energyVolatility;

  const trough = troughInsights(input);
  const dip = dipTripwire(input, suppressForDoseWindow);

  return [...doseInsights, ...volatility, ...trough, ...dip];
}
