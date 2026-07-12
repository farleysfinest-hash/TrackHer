import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useStageProfile } from '../../hooks/useStageProfile';
import type { Insight } from '../../engine/types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { InsightCard } from './InsightCard';

interface DashboardInsightsPanelProps {
  primaryInsights: Insight[];
  moreInsights: Insight[];
  onDismiss?: (insightId: string) => void;
}

export function DashboardInsightsPanel({
  primaryInsights,
  moreInsights,
  onDismiss,
}: DashboardInsightsPanelProps) {
  const stageProfile = useStageProfile();
  const [showMore, setShowMore] = useState(false);
  const hasAny = primaryInsights.length > 0 || moreInsights.length > 0;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-sage-500" />
          <h2 className="font-display text-xl text-sage-800">Insights</h2>
        </div>
        {hasAny && (
          <Link
            to="/insights"
            className="flex items-center gap-1 text-sm font-medium text-sage-600 hover:text-sage-800"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {primaryInsights.length === 0 && moreInsights.length === 0 ? (
        <Card variant="outlined" padding="md">
          <p className="text-sm text-sage-500">
            Your first check-in unlocks your baseline reading.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {primaryInsights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              compact
              onDismiss={onDismiss}
              stageProfile={stageProfile}
            />
          ))}

          {moreInsights.length > 0 && (
            <div className="pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="px-0 text-sage-600"
                onClick={() => setShowMore((open) => !open)}
              >
                {showMore ? (
                  <>
                    <ChevronUp className="mr-1 h-4 w-4" />
                    Hide {moreInsights.length} more insight{moreInsights.length === 1 ? '' : 's'}
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-1 h-4 w-4" />
                    Show {moreInsights.length} more insight{moreInsights.length === 1 ? '' : 's'}
                  </>
                )}
              </Button>
              {showMore && (
                <div className="mt-3 space-y-3">
                  {moreInsights.map((insight) => (
                    <InsightCard
                      key={insight.id}
                      insight={insight}
                      compact
                      onDismiss={onDismiss}
                      stageProfile={stageProfile}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
