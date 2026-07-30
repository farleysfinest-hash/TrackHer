import { useEffect, useMemo, useState } from 'react';
import { useInsights } from '../hooks/useInsights';
import { useStageProfile } from '../hooks/useStageProfile';
import { useAiInsightLayer } from '../hooks/useAiInsightLayer';
import { MedicalDisclaimer } from '../components/ui/MedicalDisclaimer';
import { InsightCategoryFilter } from '../components/insights/InsightCategoryFilter';
import { InsightsList } from '../components/insights/InsightsList';
import { AskDataSheet, type AskDataSeed } from '../components/insights/AskDataSheet';
import { AiNoticedList } from '../components/insights/AiNoticedList';
import { CompanionMonitorCard } from '../components/insights/CompanionMonitorCard';
import { VisitPrepCard } from '../components/insights/VisitPrepCard';
import { GapCoachCard } from '../components/insights/GapCoachCard';
import { buildGapCoachMessage } from '../utils/gapCoach';
import { PaywallModal } from '../components/subscription/PaywallModal';
import { useProGate } from '../hooks/useProGate';
import { useAuthStore } from '../stores/authStore';
import { hasMRSData } from '../utils/checkinHelpers';
import {
  filterInsightsByGroup,
  getFilterEmptyDescription,
  type InsightFilterGroup,
  INSIGHT_FILTER_OPTIONS,
} from '../utils/insightHelpers';
import { supabase } from '../lib/supabase';

const PRO_FILTERS = new Set<InsightFilterGroup>(['correlations']);

export function InsightsPage() {
  const { insights, isLoading, dismissInsight, aiContext } = useInsights();
  const stageProfile = useStageProfile();
  const [activeFilter, setActiveFilter] = useState<InsightFilterGroup>('all');
  const { requirePro, paywallOpen, paywallReason, closePaywall, isPro } = useProGate();
  const userId = useAuthStore((s) => s.user?.id);
  const [askSeed, setAskSeed] = useState<AskDataSeed | null>(null);
  const [monitorNote, setMonitorNote] = useState<{
    note: string;
    gapHint: string | null;
  } | null>(null);

  const { polishedInsights, candidates, dismissCandidate } = useAiInsightLayer(
    aiContext,
    insights,
    !isLoading,
  );

  useEffect(() => {
    if (!userId) {
      setMonitorNote(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('ai_insights')
        .select('insight_content')
        .eq('user_id', userId)
        .eq('insight_type', 'monitor_note')
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !data?.insight_content) return;
      const content = data.insight_content as { note?: string; gapHint?: string | null };
      if (typeof content.note === 'string' && content.note.trim()) {
        setMonitorNote({ note: content.note, gapHint: content.gapHint ?? null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, insights.length]);

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

      <AskDataSheet
        context={aiContext}
        seed={askSeed}
        onSeedConsumed={() => setAskSeed(null)}
      />

      <VisitPrepCard context={aiContext} />

      {monitorNote && (
        <CompanionMonitorCard note={monitorNote.note} gapHint={monitorNote.gapHint} />
      )}

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
          setAskSeed({
            insight: {
              id: insight.id,
              title: insight.title,
              body: insight.body,
              category: insight.category,
            },
          })
        }
      />

      {activeFilter === 'all' && (
        <AiNoticedList
          candidates={candidates}
          onDismiss={dismissCandidate}
          onTalkAbout={(c) => setAskSeed({ noticed: { title: c.title, body: c.body } })}
        />
      )}

      <PaywallModal isOpen={paywallOpen} onClose={closePaywall} reason={paywallReason} />
    </div>
  );
}
