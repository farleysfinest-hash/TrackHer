import type { Insight } from '../../engine/types';
import { Lightbulb } from 'lucide-react';
import { InsightCard } from './InsightCard';
import { EmptyState } from '../ui/EmptyState';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface InsightsListProps {
  insights: Insight[];
  isLoading?: boolean;
  compact?: boolean;
}

export function InsightsList({ insights, isLoading = false, compact = false }: InsightsListProps) {
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
        description="Keep logging check-ins, medications, and labs. The pattern engine needs enough data to detect meaningful trends."
      />
    );
  }

  return (
    <div className={`space-y-4 ${compact ? '' : 'max-w-3xl'}`}>
      {insights.map((insight) => (
        <InsightCard key={insight.id} insight={insight} compact={compact} />
      ))}
    </div>
  );
}
