import { CalendarRange } from 'lucide-react';
import { useDashboardStore, type DateRangePreset } from '../../stores/dashboardStore';
import { formatChartDateLong } from '../../utils/chartHelpers';
import { Card } from '../ui/Card';
import { DashboardCardHeader } from './DashboardCardHeader';

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
    <Card variant="elevated">
      <DashboardCardHeader
        icon={CalendarRange}
        eyebrow="Date range"
        title={`${formatChartDateLong(dateRange.start)} – ${formatChartDateLong(dateRange.end)}`}
        description="Scopes your averages and charts below."
      />

      <div className="mt-4 flex flex-wrap gap-1 rounded-lg border border-sand-200 bg-sand-50/80 p-1">
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setDatePreset(key)}
            className={[
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              datePreset === key
                ? 'bg-sage-500 text-on-accent'
                : 'text-sage-600 hover:bg-sand-50',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>
    </Card>
  );
}

export function useDashboardDateRange() {
  return useDashboardStore((s) => s.dateRange);
}
