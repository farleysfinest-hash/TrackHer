import { Fragment, memo, useMemo } from 'react';
import { formatChartDate, HEATMAP_COLORS } from '../../utils/chartHelpers';
import { civilDateToUTCDate, parseISODate } from '../../utils/localDate';
import { getSymptomByKey } from '../../data/symptoms';
import type { HeatmapRow } from '../../hooks/useChartData';
import { ChartCard } from '../ui/ChartCard';
import { SEVERITY_LABELS } from '../../utils/checkinHelpers';
import { heatmapRangeCaption } from '../../utils/heatmapSlots';

/** Leave most width for the day columns; shortLabels handle the names. */
const LABEL_COLUMN_WIDTH = 'minmax(4rem, 5rem)';

interface SymptomHeatmapProps {
  rows: HeatmapRow[];
}

type HeatmapCellView = HeatmapRow['cells'][number];

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

/** Month label only when the calendar month changes (first filled column always). */
function monthLabelAt(dates: HeatmapCellView[], index: number): string | null {
  const current = dates[index];
  if (!current || current.placeholder) return null;
  if (index === 0) return monthTickLabel(current.date);
  // Find previous filled column for month comparison
  let prevIdx = index - 1;
  while (prevIdx >= 0 && dates[prevIdx]?.placeholder) prevIdx -= 1;
  if (prevIdx < 0) return monthTickLabel(current.date);
  const prev = dates[prevIdx];
  const curParts = parseISODate(current.date);
  const prevParts = parseISODate(prev.date);
  if (curParts.year !== prevParts.year || curParts.month !== prevParts.month) {
    return monthTickLabel(current.date);
  }
  return null;
}

function SymptomHeatmapComponent({ rows }: SymptomHeatmapProps) {
  const isEmpty = rows.length === 0;
  const dates = useMemo(() => rows[0]?.cells ?? [], [rows]);
  const hasAnyFilled = dates.some((d) => !d.placeholder);

  const description = useMemo(() => {
    if (dates.length === 0) return 'Worst symptoms at top · weekly check-in slots';
    return heatmapRangeCaption(dates);
  }, [dates]);

  return (
    <ChartCard
      title="Symptom Heatmap"
      description={description}
      isEmpty={isEmpty}
      emptyState={{ message: 'Complete a weekly check-in to see your symptom heatmap.' }}
      minHeight="320px"
      // Not expandable: the grid is fixed-height (h-8 rows, no Recharts), so the modal
      // reproduces the same cells with no scrub, no tooltips and barely more size —
      // and it advertises "Press and drag to explore", which does nothing here.
    >
      {!isEmpty && (
        <div className="min-w-0 w-full overflow-hidden">
          <div
            className="grid min-w-0 gap-px"
            style={{
              gridTemplateColumns: `${LABEL_COLUMN_WIDTH} repeat(${dates.length}, minmax(0, 1fr))`,
            }}
          >
            <div className="bg-sand-50 px-1 pb-0 pt-2 text-[9px] font-medium leading-none text-sage-500">
              {/* spacer aligned with month row */}
            </div>
            {dates.map((d, i) => {
              const month = monthLabelAt(dates, i);
              return (
                <div
                  key={`m-${d.date}`}
                  className="overflow-hidden px-0.5 pt-2 text-center text-[9px] font-medium leading-none text-sage-500"
                  title={!d.placeholder && month ? formatChartDate(d.date) : undefined}
                >
                  {month ?? '\u00a0'}
                </div>
              );
            })}

            <div className="bg-sand-50 px-1 pb-1 pt-1 text-xs font-medium text-sage-500">Symptom</div>
            {dates.map((d) => {
              if (d.placeholder) {
                return (
                  <div
                    key={d.date}
                    className="flex items-end justify-center overflow-hidden px-0.5 pb-1 pt-0.5 text-center text-[10px] leading-none text-sage-300"
                    title="Fills with your next weekly check-in"
                  >
                    ·
                  </div>
                );
              }
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
                    className="flex h-8 min-w-0 items-center overflow-hidden bg-sand-50 pr-1 text-xs text-sage-700"
                    title={row.label}
                  >
                    <span className="truncate whitespace-nowrap">{displayLabel}</span>
                  </div>
                  {row.cells.map((cell) => {
                    if (cell.placeholder) {
                      return (
                        <div
                          key={`${row.symptomKey}-${cell.date}`}
                          className="h-8 min-w-0 rounded-sm border border-dashed border-sand-200 bg-[var(--color-heat-empty)]"
                          title="Empty slot — fills with your next weekly check-in"
                          aria-label={`${row.label}: not yet logged`}
                        />
                      );
                    }
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
                          'flex h-8 min-w-0 items-center justify-center rounded-sm text-[10px] font-semibold tabular-nums',
                          cell.score === null
                            ? 'text-sage-500'
                            : cell.score >= 3
                              ? 'text-on-accent'
                              : // Fixed dark plum — theme sage-* lightens in .dark and vanishes on pale heat cells
                                'text-[#4a2838]',
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
          {!hasAnyFilled && (
            <p className="mt-3 text-sm leading-relaxed text-sage-500">
              Empty squares fill as you complete weekly check-ins.
            </p>
          )}
        </div>
      )}
    </ChartCard>
  );
}

export const SymptomHeatmap = memo(SymptomHeatmapComponent);
