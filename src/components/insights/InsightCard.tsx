import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import type { Insight } from '../../engine/types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { InsightIcon } from '../ui/InsightIcon';
import {
  getPriorityBadgeVariant,
  getPriorityLabel,
  getCategoryLabel,
} from '../../utils/insightHelpers';
import { InsightDetailModal } from './InsightDetailModal';

interface InsightCardProps {
  insight: Insight;
  compact?: boolean;
  onDismiss?: (insightId: string) => void;
}

export function InsightCard({ insight, compact = false, onDismiss }: InsightCardProps) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <Card variant="elevated" padding={compact ? 'sm' : 'md'} className="relative">
        {onDismiss && (
          <button
            type="button"
            onClick={() => onDismiss(insight.id)}
            className="absolute right-3 top-3 rounded-full p-1 text-sage-400 transition-colors hover:bg-sage-100 hover:text-sage-600"
            aria-label={
              insight.category === 'trend_alert' ? 'Hide for 30 days' : 'Dismiss this insight'
            }
            title={
              insight.category === 'trend_alert' ? 'Hide for 30 days' : 'Dismiss this insight'
            }
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className={`flex items-start gap-3 ${onDismiss ? 'pr-8' : ''}`}>
          <div className="mt-0.5 rounded-lg bg-sage-50 p-2 text-sage-600">
            <InsightIcon category={insight.category} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={getPriorityBadgeVariant(insight.priority)} size="sm">
                {getPriorityLabel(insight.priority)}
              </Badge>
              {!compact && (
                <span className="text-xs text-sage-400">{getCategoryLabel(insight.category)}</span>
              )}
            </div>

            <h3 className="font-display text-lg text-sage-800">{insight.title}</h3>
            <p className={`mt-2 text-sage-600 ${compact ? 'text-sm line-clamp-3' : 'text-sm'}`}>
              {insight.body}
            </p>

            {insight.actionSuggestion && !compact && (
              <p className="mt-3 flex items-start gap-2 text-sm text-sage-700">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-clay-500" />
                <span className="whitespace-pre-line">{insight.actionSuggestion}</span>
              </p>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="mt-3 px-0"
              onClick={() => setShowDetail(true)}
            >
              View supporting data
            </Button>

            {!compact && (
              <p className="mt-4 border-t border-sand-200 pt-3 text-xs text-sage-400">
                {insight.disclaimer}
              </p>
            )}
          </div>
        </div>
      </Card>

      <InsightDetailModal
        insight={insight}
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
      />
    </>
  );
}
