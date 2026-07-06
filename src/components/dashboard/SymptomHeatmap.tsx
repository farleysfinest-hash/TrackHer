import { Fragment, memo } from 'react';
import { HEATMAP_COLORS } from '../../utils/chartHelpers';
import type { HeatmapRow } from '../../hooks/useChartData';
import { ChartCard } from '../ui/ChartCard';
import { SEVERITY_LABELS } from '../../utils/checkinHelpers';

interface SymptomHeatmapProps {
  rows: HeatmapRow[];
}

function SymptomHeatmapComponent({ rows }: SymptomHeatmapProps) {
  const isEmpty = rows.length === 0 || rows[0]?.cells.length === 0;
  const dates = rows[0]?.cells ?? [];

  return (
    <ChartCard
      title="Symptom Heatmap"
      description="Severity at a glance — worst symptoms at top"
      isEmpty={isEmpty}
      emptyState={{ message: 'Complete check-ins to see your symptom heatmap.' }}
      minHeight="320px"
    >
      {!isEmpty && (
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div
              className="grid gap-px"
              style={{
                gridTemplateColumns: `140px repeat(${dates.length}, minmax(36px, 1fr))`,
              }}
            >
              <div className="sticky left-0 z-10 bg-white p-2 text-xs font-medium text-sage-500">
                Symptom
              </div>
              {dates.map((d) => (
                <div
                  key={d.date}
                  className="p-1 text-center text-[10px] text-sage-400"
                >
                  {d.dateLabel}
                </div>
              ))}

              {rows.map((row) => (
                <Fragment key={row.symptomKey}>
                  <div
                    className="sticky left-0 z-10 truncate bg-white p-2 text-xs text-sage-700"
                    title={row.label}
                  >
                    {row.label.length > 18 ? row.label.slice(0, 16) + '…' : row.label}
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
                        className="flex h-8 min-w-[36px] items-center justify-center rounded-sm text-[10px] text-sage-600"
                        style={{ backgroundColor: bg }}
                        title={tip}
                      >
                        {cell.score === null ? '—' : cell.score}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </ChartCard>
  );
}

export const SymptomHeatmap = memo(SymptomHeatmapComponent);
