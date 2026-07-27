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
import {
  PANEL_MRS_HEIGHT,
  PANEL_MRS_HEIGHT_EXPANDED,
  PANEL_PULSE_HEIGHT,
  PANEL_PULSE_HEIGHT_EXPANDED,
  StoryChartsBody,
  type StoryChartRow,
} from './StoryChartsBody';

interface StoryColumnProps {
  data: SymptomTrendPoint[];
  medications: Medication[];
  medicationChanges: MedicationChange[];
  windowStart: string;
  windowEnd: string;
  insights: Insight[];
}

function StoryColumnComponent({
  data,
  medications,
  medicationChanges,
  windowStart,
  windowEnd,
  insights,
}: StoryColumnProps) {
  const isEmpty = data.length < 2;

  const pulseDefaults = useMemo(
    () => resolvePulsePanelDefaults(insights, data.map((d) => d.checkin), medicationChanges),
    [insights, data, medicationChanges],
  );

  const [pulseChannel, setPulseChannel] = useState<PulseChannel | null>(null);
  const activeChannel = pulseChannel ?? pulseDefaults.channel;
  const pulseHeader =
    pulseChannel === null
      ? pulseDefaults.header
      : `${PULSE_CHANNELS.find((c) => c.id === activeChannel)?.label} · daily pulse`;

  const { chartData, mrsSegmentKeys } = useMemo(() => {
    const rawValues = data.map((d) => getPulseChannelValue(d.checkin, activeChannel));
    const sparse = data.map((row, i) => ({
      ...row,
      pulseRaw: rawValues[i],
    }));
    const indexed = buildDailyIndexedWeeklyChart(sparse, windowStart, windowEnd, ['mrsTotal']);
    return {
      chartData: indexed.dailyRows as StoryChartRow[],
      mrsSegmentKeys: indexed.weeklySegmentKeys.mrsTotal ?? [],
    };
  }, [data, activeChannel, windowStart, windowEnd]);

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
        message: 'Check in at least twice to see your symptom trends here.',
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
