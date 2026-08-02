import { useMemo, useState } from 'react';
import { useInsights } from '../hooks/useInsights';
import { useStageProfile } from '../hooks/useStageProfile';
import { useAiInsightLayer } from '../hooks/useAiInsightLayer';
import { useTabActive } from '../components/layout/TabActiveContext';
import { MedicalDisclaimer } from '../components/ui/MedicalDisclaimer';
import { InsightCategoryFilter } from '../components/insights/InsightCategoryFilter';
import { InsightsList } from '../components/insights/InsightsList';
import { LunaSynthesisList } from '../components/insights/LunaSynthesisList';
import { VisitPrepCard } from '../components/insights/VisitPrepCard';
import { GapCoachCard } from '../components/insights/GapCoachCard';
import { buildGapCoachMessage } from '../utils/gapCoach';
import { PaywallModal } from '../components/subscription/PaywallModal';
import { useProGate } from '../hooks/useProGate';
import { hasMRSData } from '../utils/checkinHelpers';
import {
  filterInsightsByGroup,
  getFilterEmptyDescription,
  type InsightFilterGroup,
  INSIGHT_FILTER_OPTIONS,
} from '../utils/insightHelpers';
import { LunaContextCard } from '../components/luna/LunaContextCard';
import { useLuna } from '../components/luna/LunaProvider';

const PRO_FILTERS = new Set<InsightFilterGroup>(['correlations']);

export function InsightsPage() {
  const tabActive = useTabActive();
  const { insights, isLoading, dismissInsight, aiContext } = useInsights();
  const stageProfile = useStageProfile();
  const [activeFilter, setActiveFilter] = useState<InsightFilterGroup>('all');
  const { requirePro, paywallOpen, paywallReason, closePaywall, isPro } = useProGate();
  const { openLuna } = useLuna();

  const {
    polishedInsights,
    candidates,
    insufficient,
    monitorNote,
    synthesisError,
    retrySynthesis,
    isSynthesizing,
    dismissCandidate,
  } = useAiInsightLayer(
    aiContext,
    insights,
    tabActive && !isLoading && isPro,
  );

  const visibleInsights = useMemo(() => {
    if (isPro) return polishedInsights;
    return polishedInsights.filter(
      (i) => i.category !== 'dose_correlation' && i.category !== 'mixed_signals',
    );
  }, [polishedInsights, isPro]);

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

  const gapMessage = useMemo(() => {
    const mrsCount = aiContext.checkins.filter(hasMRSData).length;
    const activeMeds = aiContext.medications.filter((m) => m.is_active && !m.end_date).length;
    return buildGapCoachMessage(activeMeds, mrsCount);
  }, [aiContext.checkins, aiContext.medications]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl text-sage-800">Insights</h1>
        <p className="mt-2 text-sage-500">
          Patterns detected in your medication, symptom, and lab data — with a companion to walk
          you through them
        </p>
      </div>

      <MedicalDisclaimer />

      <LunaContextCard
        title="Ask Luna"
        description="Start a focused conversation about your patterns, scores, medications, labs, or anything in your TrackHer history."
        actionLabel="Ask Luna about your insights"
        request={{
          kind: 'insight',
          title: 'Insights questions',
          context: {
            sourceType: 'insights',
            label: 'Your Insights page',
          },
        }}
      />

      {isPro && (
        <LunaSynthesisList
          candidates={candidates}
          insufficient={insufficient}
          monitorNote={monitorNote}
          isLoading={isSynthesizing}
          synthesisError={synthesisError}
          onRetry={retrySynthesis}
          onDismiss={dismissCandidate}
          onAskInsufficient={() =>
            void openLuna({
              kind: 'insight',
              title: 'What Luna needs to compare',
              context: {
                sourceType: 'insights_data_gap',
                label: 'What information would make Insights more useful',
                insufficiency: insufficient,
              },
              seedMessage: 'What information is missing, and what is the smallest useful thing I could track next?',
            })
          }
          onAsk={(candidate) =>
            void openLuna({
              kind: 'insight',
              title: candidate.title,
              context: {
                sourceType: 'luna_synthesis',
                sourceId: candidate.id,
                label: candidate.title,
                synthesis: {
                  title: candidate.title,
                  body: candidate.body,
                  whyItMatters: candidate.whyItMatters,
                  limitations: candidate.limitations,
                  strength: candidate.strength,
                  evidence: candidate.citedFacts,
                  toolEvidence: candidate.toolEvidence ?? null,
                },
              },
              seedMessage: `Could you talk me through “${candidate.title}” and the evidence behind it?`,
            })
          }
        />
      )}

      <VisitPrepCard context={aiContext} />

      {gapMessage && !monitorNote?.gapHint && <GapCoachCard message={gapMessage} />}

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
        onTalkAbout={(insight) =>
          void openLuna({
            kind: 'insight',
            title: insight.title,
            context: {
              sourceType: 'insight',
              sourceId: insight.id,
              label: insight.title,
              category: insight.category,
              insight: {
                id: insight.id,
                title: insight.title,
                body: insight.body,
                category: insight.category,
                confidence: insight.confidence,
                supportingData: insight.supportingData,
              },
            },
            seedMessage: `Could you talk me through “${insight.title}”?`,
          })
        }
      />

      <PaywallModal isOpen={paywallOpen} onClose={closePaywall} reason={paywallReason} />
    </div>
  );
}
