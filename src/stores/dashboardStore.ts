import { create } from 'zustand';
import { addDaysISO, todayISO } from '../utils/localDate';

export type DateRangePreset = '30d' | '90d' | '6mo' | '1yr' | 'all';

export interface DateRange {
  start: string;
  end: string;
}

export function getDateRangeFromPreset(preset: DateRangePreset): DateRange {
  const end = todayISO();
  switch (preset) {
    case '30d':
      return { start: addDaysISO(end, -30), end };
    case '90d':
      return { start: addDaysISO(end, -90), end };
    case '6mo':
      return { start: addDaysISO(end, -183), end };
    case '1yr':
      return { start: addDaysISO(end, -365), end };
    default:
      return { start: '2000-01-01', end };
  }
}

interface DashboardState {
  datePreset: DateRangePreset;
  dateRange: DateRange;
  setDatePreset: (preset: DateRangePreset) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  datePreset: '90d',
  dateRange: getDateRangeFromPreset('90d'),
  setDatePreset: (preset) =>
    set({ datePreset: preset, dateRange: getDateRangeFromPreset(preset) }),
}));
