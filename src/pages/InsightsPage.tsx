import { useMemo, useState } from 'react';
import { useInsights } from '../hooks/useInsights';
import { MedicalDisclaimer } from '../components/ui/MedicalDisclaimer';
import { InsightCategoryFilter } from '../components/insights/InsightCategoryFilter';
import { InsightsList } from '../components/insights/InsightsList';
import {
  filterInsightsByGroup,
  type InsightFilterGroup,
  INSIGHT_FILTER_OPTIONS,
} from '../utils/insightHelpers';

export function InsightsPage() {
  const { insights, isLoading } = useInsights();
  const [activeFilter, setActiveFilter] = useState<InsightFilterGroup>('all');

  const filtered = useMemo(
    () => filterInsightsByGroup(insights, activeFilter),
    [insights, activeFilter],
  );

  const counts = useMemo(() => {
    const result: Partial<Record<InsightFilterGroup, number>> = { all: insights.length };
    for (const option of INSIGHT_FILTER_OPTIONS) {
      if (option.key === 'all') continue;
      result[option.key] = filterInsightsByGroup(insights, option.key).length;
    }
    return result;
  }, [insights]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl text-sage-800">Insights</h1>
        <p className="mt-2 text-sage-500">
          Patterns detected in your medication, symptom, and lab data
        </p>
      </div>

      <MedicalDisclaimer />

      <InsightCategoryFilter
        active={activeFilter}
        onChange={setActiveFilter}
        counts={counts}
      />

      <InsightsList insights={filtered} isLoading={isLoading} />
    </div>
  );
}
