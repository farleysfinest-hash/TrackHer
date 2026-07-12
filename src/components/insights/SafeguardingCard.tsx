import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import type { Insight } from '../../engine/types';
import { formatConfidenceLine } from '../../engine/confidence';
import { markInsightAsViewed } from '../../utils/insightReadState';
import { useAuthStore } from '../../stores/authStore';
import { getResolvedTimezone } from '../../utils/checkinHelpers';
import { Button } from '../ui/Button';

interface SafeguardingCardProps {
  insight: Insight;
  onDismiss?: (insightId: string) => void;
}

function resourcesLine(timezone: string): string {
  // TODO: A real region field on profiles is needed before non-US launch.
  if (timezone.startsWith('America/')) {
    return '988 (Suicide & Crisis Lifeline, call or text) or your local emergency number';
  }
  return 'your local crisis line or emergency number';
}

export function SafeguardingCard({ insight, onDismiss }: SafeguardingCardProps) {
  const profileTimezone = useAuthStore((s) => s.profile?.timezone);
  const timezone = getResolvedTimezone(profileTimezone);

  useEffect(() => {
    markInsightAsViewed(insight);
  }, [insight]);

  return (
    <div className="rounded-xl border border-alert-700/20 border-l-[3px] border-l-alert-700 bg-sand-50 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-alert-700" />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg text-alert-700">{insight.title}</h3>
          <p className="mt-1 text-sm text-sage-500">{formatConfidenceLine(insight.confidence)}</p>
          <p className="mt-2 whitespace-pre-line text-sm text-sage-800">{insight.body}</p>

          <div className="mt-4 border-t border-sand-200 pt-3">
            <p className="text-sm text-sage-700">{resourcesLine(timezone)}</p>
          </div>

          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 px-0 text-sage-600"
              onClick={() => onDismiss(insight.id)}
            >
              I&apos;ve read this
            </Button>
          )}

          <p className="mt-4 border-t border-sand-200 pt-3 text-xs text-sage-400">
            {insight.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}
