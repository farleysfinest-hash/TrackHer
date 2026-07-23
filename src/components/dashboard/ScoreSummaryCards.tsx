import { useMemo } from 'react';
import { StatCard } from '../ui/StatCard';
import type { SymptomCheckin } from '../../types/database';
import type { DateRange } from '../../stores/dashboardStore';
import { useDashboardStore } from '../../stores/dashboardStore';
import { buildScoreSummary, periodDaysLabel } from './scoreSummary';

interface ScoreSummaryCardsProps {
  /** Fetched check-ins (may include a short lookback buffer before the range). */
  checkins: SymptomCheckin[];
  dateRange: DateRange;
}

export function ScoreSummaryCards({ checkins, dateRange }: ScoreSummaryCardsProps) {
  const datePreset = useDashboardStore((s) => s.datePreset);
  const summary = useMemo(
    () => buildScoreSummary(checkins, dateRange),
    [checkins, dateRange],
  );

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="MRS Score" value={summary.mrsValue} subtext={summary.mrsSubtext} />
      <StatCard label="Energy" value={summary.energyValue} subtext={summary.energySubtext} />
      <StatCard
        label="Symptom burden"
        value={summary.burdenHeadline}
        subtext={summary.burdenDetail}
        color={summary.burdenImproving ? 'var(--color-moss-600)' : undefined}
      />
      <StatCard
        label="Days logged"
        value={summary.daysLogged >= 1 ? String(summary.daysLogged) : '—'}
        subtext={periodDaysLabel(datePreset)}
        color={summary.daysLogged >= 1 ? 'var(--color-success)' : undefined}
      />
    </div>
  );
}
