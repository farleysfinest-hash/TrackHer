import { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { ChartCard } from '../ui/ChartCard';
import { ChartTooltipContent } from './ChartTooltipContent';
import { MedicationLane } from './MedicationLane';
import { CHART_COLORS } from '../../utils/chartHelpers';
import { dailySeriesProps, rollingAverageCentered3, weeklySeriesProps } from '../../utils/chartStyle';
import {
  buildMedicationLaneRows,
  changeMarkerPercents,
  CHART_MARGIN_LEFT,
  CHART_MARGIN_RIGHT,
} from '../../utils/medicationLaneHelpers';
import type { SymptomTrendPoint } from '../../hooks/useChartData';
import type { Medication, MedicationChange } from '../../types/database';

const CHART_HEIGHT = 300;
const LANE_ROW_HEIGHT = 40;

interface OverlayChartProps {
  data: SymptomTrendPoint[];
  medications: Medication[];
  medicationChanges: MedicationChange[];
  windowStart: string;
  windowEnd: string;
}

function OverlayChartComponent({
  data,
  medications,
  medicationChanges,
  windowStart,
  windowEnd,
}: OverlayChartProps) {
  const isEmpty = data.length < 2;

  const chartData = useMemo(() => {
    const rows = data.map((d) => ({ ...d, checkin: d.checkin }));
    const smoothedEnergy = rollingAverageCentered3(rows.map((d) => d.wellbeing));
    return rows.map((row, i) => ({
      ...row,
      wellbeingSmoothed: smoothedEnergy[i],
    }));
  }, [data]);

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
    () => changeMarkerPercents(medicationChanges, domainDates, windowStart, windowEnd),
    [medicationChanges, domainDates, windowStart, windowEnd],
  );

  const mrsStyle = weeklySeriesProps(CHART_COLORS.mrsTotal, CHART_COLORS.mrsTotalDot);
  const energyStyle = dailySeriesProps(CHART_COLORS.wellbeing);

  const laneHeight = laneRows.length > 0 ? laneRows.length * LANE_ROW_HEIGHT + 12 : 0;
  const ruleHeight = CHART_HEIGHT + laneHeight;

  return (
    <ChartCard
      title="Symptom & Medication Overview"
      description="MRS score and daily energy over time, with medication changes marked"
      isEmpty={isEmpty}
      emptyState={{
        message: 'Check in at least twice to see your symptom trends here.',
        actionLabel: 'Go to Check In',
        onAction: () => {
          window.location.href = '/checkin';
        },
      }}
      minHeight="320px"
    >
      {!isEmpty && (
        <>
          <div className="relative">
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <ComposedChart
                data={chartData}
                margin={{ top: 24, right: CHART_MARGIN_RIGHT, left: CHART_MARGIN_LEFT, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} />
                <YAxis
                  yAxisId="mrs"
                  domain={[0, 44]}
                  tick={{ fontSize: 11, fill: CHART_COLORS.axisText }}
                  width={CHART_MARGIN_LEFT}
                />
                <YAxis
                  yAxisId="wellbeing"
                  orientation="right"
                  domain={[1, 5]}
                  tick={{ fontSize: 11, fill: CHART_COLORS.axisText }}
                  width={CHART_MARGIN_RIGHT}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Line
                  yAxisId="mrs"
                  dataKey="mrsTotal"
                  stroke={CHART_COLORS.mrsTotal}
                  {...mrsStyle}
                />
                <Line
                  yAxisId="wellbeing"
                  dataKey="wellbeingSmoothed"
                  stroke={CHART_COLORS.wellbeing}
                  {...energyStyle}
                />
              </ComposedChart>
            </ResponsiveContainer>

            <div
              className="pointer-events-none absolute top-0"
              style={{
                left: CHART_MARGIN_LEFT,
                right: CHART_MARGIN_RIGHT,
                height: ruleHeight,
              }}
              aria-hidden
            >
              {markerLines.map((marker) => (
                <div
                  key={marker.id}
                  className="absolute top-0 border-l border-dashed"
                  style={{
                    left: `${marker.leftPercent}%`,
                    height: ruleHeight,
                    borderColor: CHART_COLORS.changeLine,
                  }}
                />
              ))}
            </div>

            <div
              className="px-0"
              style={{
                marginLeft: CHART_MARGIN_LEFT,
                marginRight: CHART_MARGIN_RIGHT,
              }}
            >
              <MedicationLane rows={laneRows} />
            </div>
          </div>

          <div className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-sage-600">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-4 items-center" aria-hidden>
                <span
                  className="h-0.5 w-full rounded-full"
                  style={{ backgroundColor: CHART_COLORS.mrsTotal }}
                />
                <span
                  className="ml-[-2px] h-2 w-2 rounded-full"
                  style={{ backgroundColor: CHART_COLORS.mrsTotalDot }}
                />
              </span>
              <span>MRS Score (0–44)</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-0.5 w-4 rounded-full"
                style={{ backgroundColor: CHART_COLORS.wellbeing, opacity: 0.75 }}
                aria-hidden
              />
              <span>Energy (1–5)</span>
            </div>
          </div>
        </>
      )}
    </ChartCard>
  );
}

export const OverlayChart = memo(OverlayChartComponent);
