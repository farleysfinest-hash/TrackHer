import { memo, useMemo, useState } from 'react';
import { ChartCard } from '../ui/ChartCard';
import {
  buildMedicationLaneRows,
  doseChangeMarkerPercents,
} from '../../utils/medicationLaneHelpers';
import { observationWindowRegions } from '../../utils/medicationHelpers';
import {
  getPulseChannelValue,
  PULSE_CHANNELS,
  resolvePulsePanelDefaults,
  type PulseChannel,
} from '../../utils/storyColumnHelpers';
import { buildDailyIndexedWeeklyChart } from '../../utils/weeklyChartSeries';
import type { SymptomTrendPoint } from '../../hooks/useChartData';
import type { Medication, MedicationChange } from '../../types/database';
import type { Insight } from '../../engine/types';
import { daysBetweenISO } from '../../utils/localDate';
import {
  PANEL_MRS_HEIGHT,
  PANEL_MRS_HEIGHT_EXPANDED,
  PANEL_PULSE_HEIGHT,
  PANEL_PULSE_HEIGHT_EXPANDED,
  StoryChartsBody,
  type StoryChartRow,
} from './StoryChartsBody';

/** Smooth pulse data with a centred rolling average when range > threshold. */
const ROLLING_WINDOW_THRESHOLD_DAYS = 90;

function smoothPulseData(rows: StoryChartRow[], windowDays: number): StoryChartRow[] {
  if (windowDays <= ROLLING_WINDOW_THRESHOLD_DAYS) return rows;
  // Wider window for longer ranges: 7 days up to 1yr, 14 for 2yr+
  const halfWin = windowDays > 730 ? 7 : 3;
  return rows.map((row, i) => {
    if (row.pulseRaw == null) return row;
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - halfWin); j <= Math.min(rows.length - 1, i + halfWin); j++) {
      const v = rows[j].pulseRaw;
      if (v != null) { sum += v; count++; }
    }
    return count > 0 ? { ...row, pulseRaw: Math.round((sum / count) * 100) / 100 } : row;
  });
}

interface StoryColumnProps {
  data: SymptomTrendPoint[];
  medications: Medication[];
  medicationChanges: MedicationChange[];
  windowStart: string;
  windowEnd: string;
  insights: Insight[];
  /** Show a single check-in as a recorded point (default true). */
  allowSparse?: boolean;
}

function StoryColumnComponent({
  data,
  medications,
  medicationChanges,
  windowStart,
  windowEnd,
  insights,
  allowSparse = true,
}: StoryColumnProps) {
  const isEmpty = allowSparse ? data.length < 1 : data.length < 2;

  const pulseDefaults = useMemo(
    () => resolvePulsePanelDefaults(insights, data.map((d) => d.checkin), medicationChanges),
    [insights, data, medicationChanges],
  );

  const [pulseChannel, setPulseChannel] = useState<PulseChannel | null>(null);
  const activeChannel = pulseChannel ?? pulseDefaults.channel;
  const windowDays = daysBetweenISO(windowStart, windowEnd);
  const isSmoothed = windowDays > ROLLING_WINDOW_THRESHOLD_DAYS;
  const pulseHeader =
    pulseChannel === null
      ? pulseDefaults.header + (isSmoothed ? ' (smoothed)' : '')
      : `${PULSE_CHANNELS.find((c) => c.id === activeChannel)?.label} · daily pulse${isSmoothed ? ' (smoothed)' : ''}`;

  const { chartData, mrsSegmentKeys } = useMemo(() => {
    const rawValues = data.map((d) => getPulseChannelValue(d.checkin, activeChannel));
    const sparse = data.map((row, i) => ({
      ...row,
      pulseRaw: rawValues[i],
    }));
    const indexed = buildDailyIndexedWeeklyChart(sparse, windowStart, windowEnd, ['mrsTotal']);
    const smoothedRows = smoothPulseData(indexed.dailyRows as StoryChartRow[], windowDays);
    return {
      chartData: smoothedRows,
      mrsSegmentKeys: indexed.weeklySegmentKeys.mrsTotal ?? [],
    };
  }, [data, activeChannel, windowStart, windowEnd, windowDays]);

  const domainDates = useMemo(() => chartData.map((d) => d.date), [chartData]);

  const laneRows = useMemo(
    () =>
      buildMedicationLaneRows(
        medications,
        medicationChanges,
        domainDates,
        windowStart,
        windowEnd,
      ),
    [medications, medicationChanges, domainDates, windowStart, windowEnd],
  );

  const markerLines = useMemo(
    () => doseChangeMarkerPercents(medicationChanges, domainDates, windowStart, windowEnd),
    [medicationChanges, domainDates, windowStart, windowEnd],
  );

  const windowRegions = useMemo(
    () => observationWindowRegions(medicationChanges, windowStart, windowEnd),
    [medicationChanges, windowStart, windowEnd],
  );

  const chartProps = {
    chartData,
    mrsSegmentKeys,
    activeChannel,
    pulseHeader,
    onPulseChannel: setPulseChannel,
    laneRows,
    markerLines,
    windowRegions,
  };

  return (
    <ChartCard
      title="Symptom & Medication Overview"
      description="Your score, daily pulse, and medications on one timeline"
      isEmpty={isEmpty}
      emptyState={{
        message: 'Complete a weekly check-in to start your symptom story here.',
        actionLabel: 'Go to Check In',
        onAction: () => {
          window.location.href = '/checkin';
        },
      }}
      minHeight="360px"
      expandable
      expandedMinHeight="75vh"
    >
      {({ interactive }) =>
        !isEmpty ? (
          <StoryChartsBody
            {...chartProps}
            mrsHeight={interactive ? PANEL_MRS_HEIGHT_EXPANDED : PANEL_MRS_HEIGHT}
            pulseHeight={interactive ? PANEL_PULSE_HEIGHT_EXPANDED : PANEL_PULSE_HEIGHT}
            interactive={interactive}
          />
        ) : null
      }
    </ChartCard>
  );
}

export const StoryColumn = memo(StoryColumnComponent);
