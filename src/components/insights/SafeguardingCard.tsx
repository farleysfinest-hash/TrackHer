import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import type { Insight } from '../../engine/types';
import { formatConfidenceLine } from '../../engine/confidence';
import { markInsightAsViewed } from '../../utils/insightReadState';
import { Button } from '../ui/Button';

interface SafeguardingCardProps {
  insight: Insight;
  onDismiss?: (insightId: string) => void;
}

export function SafeguardingCard({ insight, onDismiss }: SafeguardingCardProps) {
  useEffect(() => {
    markInsightAsViewed(insight);
  }, [insight.id, insight.title, insight.body]);

  return (
    <div className="rounded-xl border border-alert-700/20 border-l-[3px] border-l-alert-700 bg-sand-50 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-alert-700" />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg text-alert-700">{insight.title}</h3>
          <p className="mt-1 text-sm text-sage-500">{formatConfidenceLine(insight.confidence)}</p>
          <p className="mt-2 whitespace-pre-line text-sm text-sage-800">{insight.body}</p>

          {/*
            Naming a concrete route matters here: this card only appears when the engine has
            already detected sustained deterioration, and "find your local crisis line" asks
            someone in distress to do the research themselves. Find A Helpline is listed first
            because it resolves to the right service in ~145 countries; 988 is the US default.
          */}
          <div className="mt-4 space-y-2 border-t border-sand-200 pt-3">
            <p className="text-sm text-sage-700">
              If you may be in immediate danger, contact your local emergency services.
            </p>
            <p className="text-sm text-sage-700">
              To talk to someone now,{' '}
              <a
                href="https://findahelpline.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-alert-700 underline underline-offset-2"
              >
                findahelpline.com
              </a>{' '}
              lists free, confidential lines for your country. In the US you can call or text{' '}
              <a
                href="tel:988"
                className="font-medium text-alert-700 underline underline-offset-2"
              >
                988
              </a>{' '}
              at any hour — veterans can press 1.
            </p>
            <p className="text-xs text-sage-500">
              Reaching out early is not an overreaction. You do not have to be in crisis to use
              these services.
            </p>
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
