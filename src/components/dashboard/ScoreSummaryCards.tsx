import { useMemo } from 'react';
import { StatCard } from '../ui/StatCard';
import { Card } from '../ui/Card';
import type { SymptomCheckin } from '../../types/database';
import type { DateRange, DateRangePreset } from '../../stores/dashboardStore';
import { useDashboardStore } from '../../stores/dashboardStore';
import { formatChartDateLong } from '../../utils/chartHelpers';
import { buildScoreSummary, periodDaysLabel } from './scoreSummary';

const PRESETS: { key: DateRangePreset; label: string }[] = [
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: '6mo', label: '6mo' },
  { key: '1yr', label: '1yr' },
  { key: 'all', label: 'All' },
];

interface ScoreSummaryCardsProps {
  /** Fetched check-ins (may include a short lookback buffer before the range). */
  checkins: SymptomCheckin[];
  dateRange: DateRange;
}

export function ScoreSummaryCards({ checkins, dateRange }: ScoreSummaryCardsProps) {
  const datePreset = useDashboardStore((s) => s.datePreset);
  const setDatePreset = useDashboardStore((s) => s.setDatePreset);
  const summary = useMemo(
    () => buildScoreSummary(checkins, dateRange),
    [checkins, dateRange],
  );

  return (
    <Card variant="elevated">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className="text-xs font-medium uppercase tracking-wide text-sage-500">This period</p>
        <p className="text-sm text-sage-500">
          {formatChartDateLong(dateRange.start)} – {formatChartDateLong(dateRange.end)}
        </p>
      </div>

      <div
        className="mt-3 grid grid-cols-5 rounded-lg border border-sand-200 bg-sand-50/80 p-1"
        role="group"
        aria-label="Date range"
      >
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setDatePreset(key)}
            className={[
              'whitespace-nowrap rounded-md px-1 py-1.5 text-xs font-medium transition-colors',
              datePreset === key
                ? 'bg-sage-500 text-on-accent'
                : 'text-sage-600 hover:bg-sand-50',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 border-t border-sand-200">
        <div className="border-b border-r border-sand-200">
          <StatCard
            variant="cell"
            label="MRS Score"
            value={summary.mrsValue}
            subtext={summary.mrsSubtext}
          />
        </div>
        <div className="border-b border-sand-200">
          <StatCard
            variant="cell"
            label="Energy"
            value={summary.energyValue}
            subtext={summary.energySubtext}
          />
        </div>
        <div className="border-r border-sand-200">
          <StatCard
            variant="cell"
            label="Symptom burden"
            value={summary.burdenHeadline}
            subtext={summary.burdenDetail}
            subtextClassName={
              summary.burdenImproving ? 'text-moss-600' : 'text-sage-400'
            }
          />
        </div>
        <div>
          <StatCard
            variant="cell"
            label="Days logged"
            value={summary.daysLogged >= 1 ? String(summary.daysLogged) : '—'}
            subtext={periodDaysLabel(datePreset)}
          />
        </div>
      </div>
    </Card>
  );
}
