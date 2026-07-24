import { useEffect, useMemo, useState } from 'react';
import { ChartCard } from '../ui/ChartCard';
import { useSymptomSelections } from '../../hooks/useSymptomSelections';
import { getSymptomByKey } from '../../data/symptoms';
import { formatChartDate } from '../../utils/chartHelpers';
import { buildDailyIndexedWeeklyChart, weeklyChartWindow } from '../../utils/weeklyChartSeries';
import { ChartReadoutDock } from './ChartReadoutDock';
import {
  BandPointReadout,
  BandXAxis,
  SymptomBand,
  type BandTooltipSeries,
  type SymptomBandRow,
} from './SymptomBand';
import type { SymptomCheckin, ExtendedSymptomLog } from '../../types/database';

interface PersonalSymptomTrendsProps {
  checkins: SymptomCheckin[];
  extendedLogs: ExtendedSymptomLog[];
}

const DOMAIN_MAX = 3;

function extendedSeverity(log: ExtendedSymptomLog): number {
  if (log.severity_score !== null && log.severity_score !== undefined) {
    return log.severity_score;
  }
  if (log.severity === 'mild') return 1;
  if (log.severity === 'moderate') return 2;
  if (log.severity === 'severe') return 3;
  return 0;
}

function PersonalTrendsBody({
  interactive,
  points,
  keys,
  segmentKeysByKey,
  tooltipSeries,
}: {
  interactive: boolean;
  points: SymptomBandRow[];
  keys: string[];
  segmentKeysByKey: Record<string, string[]>;
  tooltipSeries: BandTooltipSeries[];
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!interactive) setSelectedDate(null);
  }, [interactive]);

  const selectedPoint = useMemo(
    () => (selectedDate ? points.find((row) => row.date === selectedDate) ?? null : null),
    [points, selectedDate],
  );

  const bands = (
    <div className="space-y-0">
      {keys.map((key) => (
        <SymptomBand
          key={key}
          name={getSymptomByKey(key)?.label ?? key}
          dataKey={key}
          data={points}
          segmentKeys={segmentKeysByKey[key] ?? []}
          domainMax={DOMAIN_MAX}
          tooltipMode="severity"
          interactive={interactive}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      ))}
      <BandXAxis data={points} />
    </div>
  );

  if (!interactive) return bands;

  const readout = selectedPoint
    ? BandPointReadout({
        point: selectedPoint,
        tooltipSeries,
        tooltipMode: 'severity',
      })
    : null;

  return <ChartReadoutDock plot={bands} readout={readout} />;
}

export function PersonalSymptomTrends({ checkins, extendedLogs }: PersonalSymptomTrendsProps) {
  const { trackedSymptomIds } = useSymptomSelections();

  const chartData = useMemo(() => {
    if (trackedSymptomIds.length === 0) {
      return { points: [] as SymptomBandRow[], keys: [] as string[], segmentKeysByKey: {} as Record<string, string[]> };
    }

    const sorted = [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
    const candidateKeys = trackedSymptomIds.slice(0, 3);

    const rawPoints = sorted.map((checkin) => {
      const row: SymptomBandRow = {
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
      return { points: [] as SymptomBandRow[], keys: [] as string[], segmentKeysByKey: {} as Record<string, string[]> };
    }

    const dates = sorted.map((c) => c.checkin_date);
    const window = weeklyChartWindow(dates, dates[0], dates[dates.length - 1]);
    const { dailyRows, weeklySegmentKeys } = buildDailyIndexedWeeklyChart(
      rawPoints,
      window.start,
      window.end,
      keys,
    );

    return { points: dailyRows as SymptomBandRow[], keys, segmentKeysByKey: weeklySegmentKeys };
  }, [checkins, extendedLogs, trackedSymptomIds]);

  const isEmpty = chartData.points.length < 2 || chartData.keys.length === 0;

  const tooltipSeries: BandTooltipSeries[] = useMemo(
    () =>
      chartData.keys.map((seriesKey) => ({
        name: getSymptomByKey(seriesKey)?.label ?? seriesKey,
        dataKey: seriesKey,
        domainMax: DOMAIN_MAX,
      })),
    [chartData.keys],
  );

  return (
    <ChartCard
      title="Personal symptom trends"
      description="Your tracked symptoms over time (separate from MRS score)"
      isEmpty={isEmpty}
      emptyState={{
        message: 'Select personal symptoms during check-in to see trends here.',
      }}
      minHeight="210px"
      expandable
      expandedMinHeight="60vh"
    >
      {({ interactive }) =>
        !isEmpty ? (
          <PersonalTrendsBody
            interactive={interactive}
            points={chartData.points}
            keys={chartData.keys}
            segmentKeysByKey={chartData.segmentKeysByKey}
            tooltipSeries={tooltipSeries}
          />
        ) : null
      }
    </ChartCard>
  );
}
