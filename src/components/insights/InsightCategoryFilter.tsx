import type { InsightFilterGroup } from '../../utils/insightHelpers';
import { INSIGHT_FILTER_OPTIONS } from '../../utils/insightHelpers';

interface InsightCategoryFilterProps {
  active: InsightFilterGroup;
  onChange: (group: InsightFilterGroup) => void;
  counts?: Partial<Record<InsightFilterGroup, number>>;
}

export function InsightCategoryFilter({
  active,
  onChange,
  counts,
}: InsightCategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {INSIGHT_FILTER_OPTIONS.map((option) => {
        const count = counts?.[option.key];
        const isActive = active === option.key;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={[
              'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-sage-500 text-on-accent'
                : 'bg-sand-100 text-sage-600 hover:bg-sand-200',
            ].join(' ')}
          >
            {option.label}
            {count !== undefined && count > 0 ? ` (${count})` : ''}
          </button>
        );
      })}
    </div>
  );
}
