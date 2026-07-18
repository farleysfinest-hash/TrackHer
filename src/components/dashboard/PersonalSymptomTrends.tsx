import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartCard } from '../ui/ChartCard';
import { useSymptomSelections } from '../../hooks/useSymptomSelections';
import { getSymptomByKey } from '../../data/symptoms';
import { CHART_COLORS, DRILL_DOWN_COLORS, formatChartDate } from '../../utils/chartHelpers';
import { buildDailyIndexedWeeklyChart, weeklyChartWindow } from '../../utils/weeklyChartSeries';
import {
  assignRenderOffsets,
  buildDisplayRows,
  displayDataKey,
} from '../../utils/chartOverlap';
import { WeeklySegmentLines } from './WeeklySegmentLines';
import type { SymptomCheckin, ExtendedSymptomLog } from '../../types/database';

interface PersonalSymptomTrendsProps {
  checkins: SymptomCheckin[];
  extendedLogs: ExtendedSymptomLog[];
}

const DOMAIN_SPAN = 4;

function extendedSeverity(log: ExtendedSymptomLog): number {
  if (log.severity_score !== null && log.severity_score !== undefined) {
    return log.severity_score;
  }
  if (log.severity === 'mild') return 1;
  if (log.severity === 'moderate') return 2;
  if (log.severity === 'severe') return 3;
  return 0;
}

interface PersonalTrendTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    color?: string;
    name?: string;
    payload?: Record<string, number | null>;
  }>;
  label?: string | number;
}

function PersonalTrendTooltip({ active, payload, label }: PersonalTrendTooltipProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload as Record<string, unknown> | undefined;
  const gapNotice = typeof point?.gapNotice === 'string' ? point.gapNotice : null;

  const entries = payload.filter(
    (item) => typeof item.dataKey === 'string' && item.dataKey.startsWith('__display_'),
  );
  if (entries.length === 0 && !gapNotice) return null;

  return (
    <div className="rounded-lg border border-sand-200 bg-white px-4 py-3 text-sm shadow-lg">
      <p className="font-medium text-sage-800">{label}</p>
      {gapNotice && <p className="mt-1 text-sage-600">{gapNotice}</p>}
      {entries.map((item) => {
        const symptomKey = (item.dataKey as string).slice('__display_'.length);
        const value = item.payload?.[symptomKey] ?? null;
        if (value === null || value === undefined) return null;
        return (
          <p key={symptomKey} className="mt-1 text-sage-700" style={{ color: item.color }}>
            {item.name}: <strong>{value}</strong>
          </p>
        );
      })}
    </div>
  );
}

export function PersonalSymptomTrends({ checkins, extendedLogs }: PersonalSymptomTrendsProps) {
  const { trackedSymptomIds } = useSymptomSelections();

  const chartData = useMemo(() => {
    if (trackedSymptomIds.length === 0) {
      return { points: [], keys: [] as string[], segmentKeysByDisplay: {} };
    }

    const sorted = [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
    const candidateKeys = trackedSymptomIds.slice(0, DRILL_DOWN_COLORS.length);

    const rawPoints = sorted.map((checkin) => {
      const row: Record<string, string | number | null> = {
        date: checkin.checkin_date,
        dateLabel: formatChartDate(checkin.checkin_date),
      };
      for (const key of candidateKeys) {
        const log = extendedLogs.find(
          (l) => l.checkin_id === checkin.id && l.symptom_key === key,
        );
        row[key] = log ? extendedSeverity(log) : null;
      }
      return row;
    });

    const keys = candidateKeys.filter((key) =>
      rawPoints.some((point) => point[key] !== null && point[key] !== undefined),
    );
    if (keys.length === 0) {
      return { points: [], keys: [] as string[], segmentKeysByDisplay: {} };
    }

    const offsets = assignRenderOffsets(keys, rawPoints, DOMAIN_SPAN);
    const displaySparse = buildDisplayRows(rawPoints, keys, offsets);

    const dates = sorted.map((c) => c.checkin_date);
    const window = weeklyChartWindow(dates, dates[0], dates[dates.length - 1]);
    const displayKeys = keys.map(displayDataKey);
    const { dailyRows, weeklySegmentKeys } = buildDailyIndexedWeeklyChart(
      displaySparse as unknown as Array<{ date: string }>,
      window.start,
      window.end,
      displayKeys,
    );

    return { points: dailyRows, keys, segmentKeysByDisplay: weeklySegmentKeys };
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
            <Tooltip content={<PersonalTrendTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {chartData.keys.map((key, i) => {
              const color = DRILL_DOWN_COLORS[i % DRILL_DOWN_COLORS.length];
              const displayKey = displayDataKey(key);
              return (
                <WeeklySegmentLines
                  key={key}
                  segmentKeys={chartData.segmentKeysByDisplay[displayKey] ?? []}
                  name={getSymptomByKey(key)?.label ?? key}
                  stroke={color}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
