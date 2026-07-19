import { Fragment, memo } from 'react';
import { HEATMAP_COLORS } from '../../utils/chartHelpers';
import { getSymptomByKey } from '../../data/symptoms';
import type { HeatmapRow } from '../../hooks/useChartData';
import { ChartCard } from '../ui/ChartCard';
import { SEVERITY_LABELS } from '../../utils/checkinHelpers';

const LABEL_COLUMN_WIDTH = '126px';

interface SymptomHeatmapProps {
  rows: HeatmapRow[];
}

function heatmapDisplayLabel(symptomKey: string, fallbackLabel: string): string {
  const symptom = getSymptomByKey(symptomKey);
  if (symptom?.shortLabel) return symptom.shortLabel;
  return fallbackLabel;
}

function SymptomHeatmapComponent({ rows }: SymptomHeatmapProps) {
  const isEmpty = rows.length === 0 || rows[0]?.cells.length === 0;
  const dates = rows[0]?.cells ?? [];

  return (
    <ChartCard
      title="Symptom Heatmap"
      description="Worst symptoms at top · last 8 check-ins"
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
            <div className="bg-white p-2 text-xs font-medium text-sage-500">Symptom</div>
            {dates.map((d) => (
              <div
                key={d.date}
                className="truncate p-1 text-center text-[10px] leading-tight text-sage-400"
                title={d.dateLabel}
              >
                {d.dateLabel}
              </div>
            ))}

            {rows.map((row) => {
              const displayLabel = heatmapDisplayLabel(row.symptomKey, row.label);

              return (
                <Fragment key={row.symptomKey}>
                  <div
                    className="flex h-8 min-w-0 items-center overflow-hidden bg-white pr-2 text-xs text-sage-700"
                    title={row.label}
                  >
                    <span className="truncate whitespace-nowrap">{displayLabel}</span>
                  </div>
                  {row.cells.map((cell) => {
                    const bg =
                      cell.score === null
                        ? '#f5ebef'
                        : HEATMAP_COLORS[cell.score as 0 | 1 | 2 | 3 | 4] ?? '#f5ebef';
                    const tip = `${row.label} · ${cell.dateLabel}: ${
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
