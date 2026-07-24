import { memo, useEffect, useMemo, useState } from 'react';
import { ChartCard } from '../ui/ChartCard';
import { buildDailyIndexedWeeklyChart, weeklyChartWindow } from '../../utils/weeklyChartSeries';
import { MRS_SUBSCALES } from '../../data/mrsSubscales';
import { ChartReadoutDock } from './ChartReadoutDock';
import {
  BandPointReadout,
  BandXAxis,
  SymptomBand,
  type BandTooltipSeries,
  type SymptomBandRow,
} from './SymptomBand';
import { observationWindowRegions } from '../../utils/medicationHelpers';
import type { SymptomTrendPoint } from '../../hooks/useChartData';
import type { MedicationChange } from '../../types/database';

interface SubscaleChartProps {
  data: SymptomTrendPoint[];
  changes?: MedicationChange[];
}

const SUBSCALE_VALUE_KEYS = MRS_SUBSCALES.map((s) => s.dataKey);

const TOOLTIP_SERIES: BandTooltipSeries[] = MRS_SUBSCALES.map((s) => ({
  name: s.plainLabel,
  dataKey: s.dataKey,
  domainMax: s.maxScore,
}));

function SubscaleBody({
  interactive,
  dailyRows,
  weeklySegmentKeys,
  windowRegions,
}: {
  interactive: boolean;
  dailyRows: SymptomBandRow[];
  weeklySegmentKeys: Record<string, string[]>;
  windowRegions: ReturnType<typeof observationWindowRegions>;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!interactive) setSelectedDate(null);
  }, [interactive]);

  const selectedPoint = useMemo(
    () => (selectedDate ? dailyRows.find((row) => row.date === selectedDate) ?? null : null),
    [dailyRows, selectedDate],
  );

  const bands = (
    <div className="space-y-0">
      {MRS_SUBSCALES.map((subscale) => (
        <SymptomBand
          key={subscale.dataKey}
          name={subscale.plainLabel}
          dataKey={subscale.dataKey}
          data={dailyRows}
          segmentKeys={weeklySegmentKeys[subscale.dataKey] ?? []}
          domainMax={subscale.maxScore}
          tooltipMode="subscale"
          observationRegions={windowRegions}
          interactive={interactive}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      ))}
      <BandXAxis data={dailyRows} />
      {windowRegions.length > 0 && (
        <p className="mt-2 text-xs text-sage-400">
          Shaded area — observation window after a dose change.
        </p>
      )}
    </div>
  );

  if (!interactive) return bands;

  const readout = selectedPoint
    ? BandPointReadout({
        point: selectedPoint,
        tooltipSeries: TOOLTIP_SERIES,
        tooltipMode: 'subscale',
        showMrsTotal: true,
      })
    : null;

  return <ChartReadoutDock plot={bands} readout={readout} />;
}

function SubscaleChartComponent({ data, changes = [] }: SubscaleChartProps) {
  const isEmpty = data.length < 2;

  const { dailyRows, weeklySegmentKeys, chartWindow } = useMemo(() => {
    if (data.length < 2) {
      return {
        dailyRows: [] as SymptomBandRow[],
        weeklySegmentKeys: {} as Record<string, string[]>,
        chartWindow: { start: '', end: '' },
      };
    }

    const sparseRows: SymptomBandRow[] = data.map((point) => ({
      date: point.date,
      dateLabel: point.dateLabel,
      psychological: point.psychological ?? null,
      somatic: point.somatic ?? null,
      urogenital: point.urogenital ?? null,
    }));

    const dates = data.map((d) => d.date);
    const window = weeklyChartWindow(dates, dates[0], dates[dates.length - 1]);
    const indexed = buildDailyIndexedWeeklyChart(sparseRows, window.start, window.end, SUBSCALE_VALUE_KEYS);
    return {
      dailyRows: indexed.dailyRows as SymptomBandRow[],
      weeklySegmentKeys: indexed.weeklySegmentKeys,
      chartWindow: window,
    };
  }, [data]);

  const windowRegions = useMemo(() => {
    if (!chartWindow.start || !chartWindow.end) return [];
    return observationWindowRegions(changes, chartWindow.start, chartWindow.end);
  }, [changes, chartWindow.start, chartWindow.end]);

  return (
    <ChartCard
      title="MRS Subscale Breakdown"
      description="Three parts of your MRS score (total 0–44)"
      isEmpty={isEmpty}
      emptyState={{ message: 'Need at least 2 check-ins to show subscale trends.' }}
      minHeight="210px"
      expandable
      expandedMinHeight="60vh"
    >
      {({ interactive }) =>
        !isEmpty ? (
          <SubscaleBody
            interactive={interactive}
            dailyRows={dailyRows}
            weeklySegmentKeys={weeklySegmentKeys}
            windowRegions={windowRegions}
          />
        ) : null
      }
    </ChartCard>
  );
}

export const SubscaleChart = memo(SubscaleChartComponent);
