import type { Insight } from '../../engine/types';
import type { StageProfile } from '../../engine/stageProfile';
import { Lightbulb } from 'lucide-react';
import { InsightCard } from './InsightCard';
import { EmptyState } from '../ui/EmptyState';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface InsightsListProps {
  insights: Insight[];
  isLoading?: boolean;
  compact?: boolean;
  onDismiss?: (insightId: string) => void;
  stageProfile?: StageProfile | null;
}

export function InsightsList({
  insights,
  isLoading = false,
  compact = false,
  onDismiss,
  stageProfile,
}: InsightsListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <EmptyState
        icon={Lightbulb}
        title="No insights yet"
        description="Your first check-in unlocks your baseline reading."
      />
    );
  }

  return (
    <div className={`space-y-4 ${compact ? '' : 'max-w-3xl'}`}>
      {insights.map((insight) => (
        <InsightCard
          key={insight.id}
          insight={insight}
          compact={compact}
          onDismiss={onDismiss}
          stageProfile={stageProfile}
        />
      ))}
    </div>
  );
}
