import { useMemo, useState } from 'react';
import { useInsights } from '../hooks/useInsights';
import { useStageProfile } from '../hooks/useStageProfile';
import { MedicalDisclaimer } from '../components/ui/MedicalDisclaimer';
import { InsightCategoryFilter } from '../components/insights/InsightCategoryFilter';
import { InsightsList } from '../components/insights/InsightsList';
import { Button } from '../components/ui/Button';
import {
  filterInsightsByGroup,
  FILTER_EMPTY_DESCRIPTIONS,
  FILTER_EMPTY_FOLLOWUP,
  type InsightFilterGroup,
  INSIGHT_FILTER_OPTIONS,
} from '../utils/insightHelpers';

export function InsightsPage() {
  const { primaryInsights, moreInsights, insights, isLoading, dismissInsight } = useInsights();
  const stageProfile = useStageProfile();
  const [activeFilter, setActiveFilter] = useState<InsightFilterGroup>('all');
  const [showMore, setShowMore] = useState(false);

  const filteredPrimary = useMemo(
    () => filterInsightsByGroup(primaryInsights, activeFilter),
    [primaryInsights, activeFilter],
  );
  const filteredMore = useMemo(
    () => filterInsightsByGroup(moreInsights, activeFilter),
    [moreInsights, activeFilter],
  );

  const counts = useMemo(() => {
    const result: Partial<Record<InsightFilterGroup, number>> = { all: insights.length };
    for (const option of INSIGHT_FILTER_OPTIONS) {
      if (option.key === 'all') continue;
      result[option.key] = filterInsightsByGroup(insights, option.key).length;
    }
    return result;
  }, [insights]);

  const filteredEmptyCopy =
    activeFilter !== 'all' && insights.length > 0
      ? {
          title: 'Nothing here yet',
          description: `${FILTER_EMPTY_DESCRIPTIONS[activeFilter]} ${FILTER_EMPTY_FOLLOWUP}`,
        }
      : null;

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

      <InsightsList
        insights={filteredPrimary}
        isLoading={isLoading}
        onDismiss={dismissInsight}
        stageProfile={stageProfile}
        emptyTitle={filteredEmptyCopy?.title}
        emptyDescription={filteredEmptyCopy?.description}
      />

      {!isLoading && filteredMore.length > 0 && (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" className="px-0" onClick={() => setShowMore((v) => !v)}>
            {showMore ? 'Hide' : 'Show'} {filteredMore.length} more insight
            {filteredMore.length === 1 ? '' : 's'}
          </Button>
          {showMore && (
            <InsightsList
              insights={filteredMore}
              onDismiss={dismissInsight}
              stageProfile={stageProfile}
            />
          )}
        </div>
      )}
    </div>
  );
}
