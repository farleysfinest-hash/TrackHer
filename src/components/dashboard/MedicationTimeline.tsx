import { useMemo } from 'react';
import { ChartCard } from '../ui/ChartCard';
import { CHART_COLORS } from '../../utils/chartHelpers';
import type { MedicationBar } from '../../hooks/useChartData';
import { formatChartDate } from '../../utils/chartHelpers';
import { civilDateOrdinal } from '../../utils/localDate';

interface MedicationTimelineProps {
  bars: MedicationBar[];
}

/** Every HormoneCategory gets a rose ink. Adjuncts (dhea, thyroid, oxytocin,
 *  supplement) share one light supportive tone — they are not the therapy the
 *  engine reasons about, and every bar is labelled with its drug name. */
function categoryColor(category: string): string {
  switch (category) {
    case 'estrogen':
      return CHART_COLORS.estrogen;
    case 'progesterone':
      return CHART_COLORS.progesterone;
    case 'testosterone':
      return CHART_COLORS.testosterone;
    case 'combination':
      return CHART_COLORS.combination;
    case 'dhea':
    case 'thyroid':
    case 'oxytocin':
    case 'supplement':
      return CHART_COLORS.supportive;
    default:
      return CHART_COLORS.other;
  }
}

export function MedicationTimeline({ bars }: MedicationTimelineProps) {
  const { rangeStart, rangeEnd, timelineBars } = useMemo(() => {
    if (bars.length === 0) {
      return { rangeStart: '', rangeEnd: '', timelineBars: [] };
    }
    const starts = bars.map((b) => b.startDate);
    const ends = bars.map((b) => b.endDate);
    const rangeStart = starts.sort()[0];
    const rangeEnd = ends.sort().reverse()[0];
    const startDay = civilDateOrdinal(rangeStart);
    const endDay = civilDateOrdinal(rangeEnd);
    const span = endDay - startDay || 1;

    const timelineBars = bars.map((bar) => {
      const barStart = civilDateOrdinal(bar.startDate);
      const barEnd = civilDateOrdinal(bar.endDate);
      const left = ((barStart - startDay) / span) * 100;
      const width = Math.max(((barEnd - barStart) / span) * 100, 2);
      return { ...bar, left, width };
    });

    return { rangeStart, rangeEnd, timelineBars };
  }, [bars]);

  const isEmpty = bars.length === 0;

  return (
    <ChartCard
      title="Medication Timeline"
      description="When each medication was active during this period"
      isEmpty={isEmpty}
      emptyState={{ message: 'Add medications to see your timeline.' }}
      minHeight="200px"
    >
      {!isEmpty && (
        <div className="space-y-3">
          <div className="flex justify-between text-xs text-sage-400">
            <span>{formatChartDate(rangeStart)}</span>
            <span>{formatChartDate(rangeEnd)}</span>
          </div>
          {timelineBars.map((bar) => (
            <div key={bar.id} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium text-sage-700">{bar.name}</p>
                <p className="shrink-0 text-xs text-sage-400">
                  {bar.dose} {bar.doseUnit}
                </p>
              </div>
              <div className="relative h-6 rounded-md bg-sand-50">
                <div
                  className="absolute top-0 h-full rounded-md opacity-80"
                  style={{
                    left: `${bar.left}%`,
                    width: `${bar.width}%`,
                    backgroundColor: categoryColor(bar.hormoneCategory),
                  }}
                  title={`${bar.name}: ${formatChartDate(bar.startDate)} – ${formatChartDate(bar.endDate)}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  );
}
