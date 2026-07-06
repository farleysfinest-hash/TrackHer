import { memo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { ChartCard } from '../ui/ChartCard';
import { ChartTooltipContent } from './ChartTooltipContent';
import { CHART_COLORS } from '../../utils/chartHelpers';
import { MRS_SUBSCALES, MRS_SUBSCALE_DESCRIPTION } from '../../data/mrsSubscales';
import type { SymptomTrendPoint } from '../../hooks/useChartData';

interface SubscaleChartProps {
  data: SymptomTrendPoint[];
}

function SubscaleChartComponent({ data }: SubscaleChartProps) {
  const isEmpty = data.length < 2;

  return (
    <ChartCard
      title="MRS Subscale Breakdown"
      description={MRS_SUBSCALE_DESCRIPTION}
      isEmpty={isEmpty}
      emptyState={{ message: 'Need at least 2 check-ins to show subscale trends.' }}
      minHeight="280px"
    >
      {!isEmpty && (
        <>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} />
              <YAxis domain={[0, 16]} tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} width={28} />
              <Tooltip content={<ChartTooltipContent />} />
              {MRS_SUBSCALES.map((subscale) => (
                <Line
                  key={subscale.dataKey}
                  type="monotone"
                  dataKey={subscale.dataKey}
                  name={subscale.plainLabel}
                  stroke={subscale.color}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

          <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-3">
            {MRS_SUBSCALES.map((subscale) => (
              <div key={subscale.dataKey} className="flex items-start gap-2">
                <span
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: subscale.color }}
                  aria-hidden
                />
                <div>
                  <p className="text-xs font-medium text-sage-700">{subscale.plainLabel}</p>
                  <p className="text-[10px] text-sage-400">({subscale.clinicalLabel})</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </ChartCard>
  );
}

export const SubscaleChart = memo(SubscaleChartComponent);
