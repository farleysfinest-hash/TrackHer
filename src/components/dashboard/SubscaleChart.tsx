import { memo, useMemo } from 'react';
import { ChartCard } from '../ui/ChartCard';
import { buildDailyIndexedWeeklyChart, weeklyChartWindow } from '../../utils/weeklyChartSeries';
import { MRS_SUBSCALES } from '../../data/mrsSubscales';
import {
  BandXAxis,
  SymptomBand,
  type BandTooltipSeries,
  type SymptomBandRow,
} from './SymptomBand';
import type { SymptomTrendPoint } from '../../hooks/useChartData';

interface SubscaleChartProps {
  data: SymptomTrendPoint[];
}

const SUBSCALE_VALUE_KEYS = MRS_SUBSCALES.map((s) => s.dataKey);
const SYNC_ID = 'subscale-breakdown';

const TOOLTIP_SERIES: BandTooltipSeries[] = MRS_SUBSCALES.map((s) => ({
  name: s.plainLabel,
  dataKey: s.dataKey,
  domainMax: s.maxScore,
}));

function SubscaleChartComponent({ data }: SubscaleChartProps) {
  const isEmpty = data.length < 2;

  const { dailyRows, weeklySegmentKeys } = useMemo(() => {
    if (data.length < 2) {
      return { dailyRows: [] as SymptomBandRow[], weeklySegmentKeys: {} as Record<string, string[]> };
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
    };
  }, [data]);

  return (
    <ChartCard
      title="MRS Subscale Breakdown"
      description="Three parts of your MRS score (total 0–44)"
      isEmpty={isEmpty}
      emptyState={{ message: 'Need at least 2 check-ins to show subscale trends.' }}
      minHeight="210px"
    >
      {!isEmpty && (
        <div className="space-y-0">
          {MRS_SUBSCALES.map((subscale, index) => (
            <SymptomBand
              key={subscale.dataKey}
              name={subscale.plainLabel}
              dataKey={subscale.dataKey}
              data={dailyRows}
              segmentKeys={weeklySegmentKeys[subscale.dataKey] ?? []}
              domainMax={subscale.maxScore}
              syncId={SYNC_ID}
              tooltipMode="subscale"
              tooltipSeries={TOOLTIP_SERIES}
              isTooltipHost={index === 0}
              showMrsTotal
            />
          ))}
          <BandXAxis data={dailyRows} />
        </div>
      )}
    </ChartCard>
  );
}

export const SubscaleChart = memo(SubscaleChartComponent);
