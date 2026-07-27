import { memo, useMemo } from 'react';
import { ChartCard } from '../ui/ChartCard';
import { buildDailyIndexedWeeklyChart } from '../../utils/weeklyChartSeries';
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
import { useChartSelection } from '../../hooks/useChartSelection';

interface SubscaleChartProps {
  data: SymptomTrendPoint[];
  changes?: MedicationChange[];
  windowStart: string;
  windowEnd: string;
  /** Show a single check-in as a recorded point (default true). */
  allowSparse?: boolean;
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
  const { selectedDate, selectDate } = useChartSelection(interactive);

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
          onSelectDate={selectDate}
        />
      ))}
      <BandXAxis data={dailyRows} />
      {windowRegions.length > 0 && (
        <p className="mt-2 text-sm leading-relaxed text-sage-500">
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

function SubscaleChartComponent({
  data,
  changes = [],
  windowStart,
  windowEnd,
  allowSparse = true,
}: SubscaleChartProps) {
  const isEmpty = allowSparse ? data.length < 1 : data.length < 2;

  const { dailyRows, weeklySegmentKeys } = useMemo(() => {
    if (data.length < 1 || (!allowSparse && data.length < 2)) {
      return {
        dailyRows: [] as SymptomBandRow[],
        weeklySegmentKeys: {} as Record<string, string[]>,
      };
    }

    const sparseRows: SymptomBandRow[] = data.map((point) => ({
      date: point.date,
      dateLabel: point.dateLabel,
      psychological: point.psychological ?? null,
      somatic: point.somatic ?? null,
      urogenital: point.urogenital ?? null,
    }));

    const indexed = buildDailyIndexedWeeklyChart(
      sparseRows,
      windowStart,
      windowEnd,
      SUBSCALE_VALUE_KEYS,
    );
    return {
      dailyRows: indexed.dailyRows as SymptomBandRow[],
      weeklySegmentKeys: indexed.weeklySegmentKeys,
    };
  }, [allowSparse, data, windowEnd, windowStart]);

  const windowRegions = useMemo(
    () => observationWindowRegions(changes, windowStart, windowEnd),
    [changes, windowStart, windowEnd],
  );

  return (
    <ChartCard
      title="MRS Subscale Breakdown"
      description="Three parts of your MRS score (total 0–44)"
      isEmpty={isEmpty}
      emptyState={{
        message: 'Complete a weekly check-in to see subscale scores here.',
      }}
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
