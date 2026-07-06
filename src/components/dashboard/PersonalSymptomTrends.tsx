import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartCard } from '../ui/ChartCard';
import { useSymptomSelections } from '../../hooks/useSymptomSelections';
import { getSymptomByKey } from '../../data/symptoms';
import { formatChartDate } from '../../utils/chartHelpers';
import type { SymptomCheckin, ExtendedSymptomLog } from '../../types/database';
import { CHART_COLORS, DRILL_DOWN_COLORS } from '../../utils/chartHelpers';

interface PersonalSymptomTrendsProps {
  checkins: SymptomCheckin[];
  extendedLogs: ExtendedSymptomLog[];
}

function extendedSeverity(log: ExtendedSymptomLog): number {
  if (log.severity_score !== null && log.severity_score !== undefined) {
    return log.severity_score;
  }
  if (log.severity === 'mild') return 1;
  if (log.severity === 'moderate') return 2;
  if (log.severity === 'severe') return 3;
  return 0;
}

export function PersonalSymptomTrends({ checkins, extendedLogs }: PersonalSymptomTrendsProps) {
  const { trackedSymptomIds } = useSymptomSelections();

  const chartData = useMemo(() => {
    if (trackedSymptomIds.length === 0) return { points: [], keys: [] as string[] };

    const sorted = [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
    const keys = trackedSymptomIds.slice(0, 5);

    const points = sorted.map((checkin) => {
      const row: Record<string, string | number | null> = {
        dateLabel: formatChartDate(checkin.checkin_date),
      };
      for (const key of keys) {
        const log = extendedLogs.find(
          (l) => l.checkin_id === checkin.id && l.symptom_key === key,
        );
        row[key] = log ? extendedSeverity(log) : null;
      }
      return row;
    });

    return { points, keys };
  }, [checkins, extendedLogs, trackedSymptomIds]);

  const isEmpty = chartData.points.length < 2 || chartData.keys.length === 0;

  return (
    <ChartCard
      title="Personal symptom trends"
      description="Your tracked symptoms over time (separate from MRS score)"
      isEmpty={isEmpty}
      emptyState={{
        message: 'Select personal symptoms during check-in to see trends here.',
      }}
      minHeight="280px"
    >
      {!isEmpty && (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} />
            <YAxis domain={[0, 4]} tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} width={28} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {chartData.keys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={getSymptomByKey(key)?.label ?? key}
                stroke={DRILL_DOWN_COLORS[i % DRILL_DOWN_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
