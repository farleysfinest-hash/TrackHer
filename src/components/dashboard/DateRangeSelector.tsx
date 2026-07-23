import { useDashboardStore } from '../../stores/dashboardStore';

/** Hook kept for callers that only need the active dashboard date window. */
export function useDashboardDateRange() {
  return useDashboardStore((s) => s.dateRange);
}
