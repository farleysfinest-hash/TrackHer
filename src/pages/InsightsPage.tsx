import { useMemo, useState } from 'react';
import { useInsights } from '../hooks/useInsights';
import { useStageProfile } from '../hooks/useStageProfile';
import { MedicalDisclaimer } from '../components/ui/MedicalDisclaimer';
import { InsightCategoryFilter } from '../components/insights/InsightCategoryFilter';
import { InsightsList } from '../components/insights/InsightsList';
import { PaywallModal } from '../components/subscription/PaywallModal';
import { useProGate } from '../hooks/useProGate';
import {
  filterInsightsByGroup,
  getFilterEmptyDescription,
  type InsightFilterGroup,
  INSIGHT_FILTER_OPTIONS,
} from '../utils/insightHelpers';

const PRO_FILTERS = new Set<InsightFilterGroup>(['correlations']);

export function InsightsPage() {
  const { insights, isLoading, dismissInsight } = useInsights();
  const stageProfile = useStageProfile();
  const [activeFilter, setActiveFilter] = useState<InsightFilterGroup>('all');
  const { requirePro, paywallOpen, paywallReason, closePaywall, isPro } = useProGate();

  const visibleInsights = useMemo(() => {
    if (isPro) return insights;
    // Free tier: keep safety/trends/basic; hide correlation readouts until Pro.
    return insights.filter(
      (i) => i.category !== 'dose_correlation' && i.category !== 'mixed_signals',
    );
  }, [insights, isPro]);

  const filtered = useMemo(
    () => filterInsightsByGroup(visibleInsights, activeFilter),
    [visibleInsights, activeFilter],
  );

  const counts = useMemo(() => {
    const result: Partial<Record<InsightFilterGroup, number>> = { all: visibleInsights.length };
    for (const option of INSIGHT_FILTER_OPTIONS) {
      if (option.key === 'all') continue;
      result[option.key] = filterInsightsByGroup(visibleInsights, option.key).length;
    }
    return result;
  }, [visibleInsights]);

  const filteredEmptyCopy =
    activeFilter !== 'all' && visibleInsights.length > 0 && filtered.length === 0
      ? {
          title: 'Nothing here yet',
          description: getFilterEmptyDescription(activeFilter),
        }
      : null;

  const onFilterChange = (next: InsightFilterGroup) => {
    if (PRO_FILTERS.has(next) && !isPro) {
      requirePro(
        undefined,
        'Correlation insights—what changed after your HRT changed—are part of TrackHer Pro.',
      );
      return;
    }
    setActiveFilter(next);
  };

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
        onChange={onFilterChange}
        counts={counts}
      />

      <InsightsList
        insights={filtered}
        isLoading={isLoading}
        onDismiss={dismissInsight}
        stageProfile={stageProfile}
        emptyTitle={filteredEmptyCopy?.title}
        emptyDescription={filteredEmptyCopy?.description}
      />

      <PaywallModal isOpen={paywallOpen} onClose={closePaywall} reason={paywallReason} />
    </div>
  );
}
