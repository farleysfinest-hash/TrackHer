import { useDashboardStore, type DateRangePreset } from '../../stores/dashboardStore';
import { formatChartDateLong } from '../../utils/chartHelpers';

const PRESETS: { key: DateRangePreset; label: string }[] = [
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: '6mo', label: '6 months' },
  { key: '1yr', label: '1 year' },
  { key: 'all', label: 'All' },
];

export function DateRangeSelector() {
  const datePreset = useDashboardStore((s) => s.datePreset);
  const dateRange = useDashboardStore((s) => s.dateRange);
  const setDatePreset = useDashboardStore((s) => s.setDatePreset);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-sage-500">
        Showing: {formatChartDateLong(dateRange.start)} – {formatChartDateLong(dateRange.end)}
      </p>
      <div className="flex flex-wrap gap-1 rounded-lg border border-sand-200 bg-white p-1">
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setDatePreset(key)}
            className={[
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              datePreset === key
                ? 'bg-sage-500 text-white'
                : 'text-sage-600 hover:bg-sage-50',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function useDashboardDateRange() {
  return useDashboardStore((s) => s.dateRange);
}
