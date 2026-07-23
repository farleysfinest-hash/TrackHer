import { Fragment, memo, useMemo } from 'react';
import { formatChartDate, HEATMAP_COLORS } from '../../utils/chartHelpers';
import { civilDateToUTCDate, parseISODate } from '../../utils/localDate';
import { getSymptomByKey } from '../../data/symptoms';
import type { HeatmapRow } from '../../hooks/useChartData';
import { ChartCard } from '../ui/ChartCard';
import { SEVERITY_LABELS } from '../../utils/checkinHelpers';

/** Leave most width for the day columns; shortLabels handle the names. */
const LABEL_COLUMN_WIDTH = 'minmax(4rem, 5rem)';

interface SymptomHeatmapProps {
  rows: HeatmapRow[];
}

function heatmapDisplayLabel(symptomKey: string, fallbackLabel: string): string {
  const symptom = getSymptomByKey(symptomKey);
  if (symptom?.shortLabel) return symptom.shortLabel;
  return fallbackLabel;
}

function monthTickLabel(dateStr: string): string {
  return civilDateToUTCDate(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    timeZone: 'UTC',
  });
}

/** Month label only when the calendar month changes (first column always). */
function monthLabelAt(dates: Array<{ date: string }>, index: number): string | null {
  const current = dates[index]?.date;
  if (!current) return null;
  if (index === 0) return monthTickLabel(current);
  const prev = dates[index - 1]?.date;
  if (!prev) return monthTickLabel(current);
  const curParts = parseISODate(current);
  const prevParts = parseISODate(prev);
  if (curParts.year !== prevParts.year || curParts.month !== prevParts.month) {
    return monthTickLabel(current);
  }
  return null;
}

function SymptomHeatmapComponent({ rows }: SymptomHeatmapProps) {
  const isEmpty = rows.length === 0 || rows[0]?.cells.length === 0;
  const dates = rows[0]?.cells ?? [];

  const rangeLabel = useMemo(() => {
    if (dates.length === 0) return null;
    const first = dates[0].date;
    const last = dates[dates.length - 1].date;
    if (first === last) return formatChartDate(first);
    return `${formatChartDate(first)} – ${formatChartDate(last)}`;
  }, [dates]);

  return (
    <ChartCard
      title="Symptom Heatmap"
      description={
        rangeLabel
          ? `Worst symptoms at top · last ${dates.length} check-ins · ${rangeLabel}`
          : 'Worst symptoms at top · last 8 check-ins'
      }
      isEmpty={isEmpty}
      emptyState={{ message: 'Complete check-ins to see your symptom heatmap.' }}
      minHeight="320px"
    >
      {!isEmpty && (
        <div className="min-w-0 w-full overflow-hidden">
          <div
            className="grid min-w-0 gap-px"
            style={{
              gridTemplateColumns: `${LABEL_COLUMN_WIDTH} repeat(${dates.length}, minmax(0, 1fr))`,
            }}
          >
            <div className="bg-white px-1 pb-0 pt-2 text-[9px] font-medium leading-none text-sage-500">
              {/* spacer aligned with month row */}
            </div>
            {dates.map((d, i) => {
              const month = monthLabelAt(dates, i);
              return (
                <div
                  key={`m-${d.date}`}
                  className="overflow-hidden px-0.5 pt-2 text-center text-[9px] font-medium leading-none text-sage-500"
                  title={month ? formatChartDate(d.date) : undefined}
                >
                  {month ?? '\u00a0'}
                </div>
              );
            })}

            <div className="bg-white px-1 pb-1 pt-1 text-xs font-medium text-sage-500">Symptom</div>
            {dates.map((d) => {
              const day = parseISODate(d.date).day;
              return (
                <div
                  key={d.date}
                  className="flex items-end justify-center overflow-hidden px-0.5 pb-1 pt-0.5 text-center text-[10px] tabular-nums leading-none text-sage-400"
                  title={formatChartDate(d.date)}
                >
                  {day}
                </div>
              );
            })}

            {rows.map((row) => {
              const displayLabel = heatmapDisplayLabel(row.symptomKey, row.label);

              return (
                <Fragment key={row.symptomKey}>
                  <div
                    className="flex h-8 min-w-0 items-center overflow-hidden bg-white pr-1 text-xs text-sage-700"
                    title={row.label}
                  >
                    <span className="truncate whitespace-nowrap">{displayLabel}</span>
                  </div>
                  {row.cells.map((cell) => {
                    const bg =
                      cell.score === null
                        ? 'var(--color-heat-empty)'
                        : HEATMAP_COLORS[cell.score as 0 | 1 | 2 | 3 | 4] ?? 'var(--color-heat-empty)';
                    const tip = `${row.label} · ${formatChartDate(cell.date)}: ${
                      cell.score === null ? 'Not rated' : SEVERITY_LABELS[cell.score]
                    }`;
                    return (
                      <div
                        key={`${row.symptomKey}-${cell.date}`}
                        className={[
                          'flex h-8 min-w-0 items-center justify-center rounded-sm text-[10px]',
                          cell.score === null
                            ? 'text-sage-300'
                            : cell.score >= 3
                              ? 'text-white'
                              : 'text-sage-600',
                        ].join(' ')}
                        style={{ backgroundColor: bg }}
                        title={tip}
                      >
                        {cell.score === null ? '—' : cell.score}
                      </div>
                    );
                  })}
                </Fragment>
              );
            })}
          </div>
        </div>
      )}
    </ChartCard>
  );
}

export const SymptomHeatmap = memo(SymptomHeatmapComponent);
