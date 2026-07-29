import { MessageCircleHeart } from 'lucide-react';
import { Card } from '../ui/Card';

interface CompanionMonitorCardProps {
  note: string;
  gapHint?: string | null;
}

/** Warm post-check-in / weekly companion note on Insights. */
export function CompanionMonitorCard({ note, gapHint }: CompanionMonitorCardProps) {
  return (
    <Card variant="elevated" padding="md" className="border border-sage-200/80 bg-sage-50/40">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-sage-100 p-2 text-sage-600">
          <MessageCircleHeart className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-sage-500">
            From your companion
          </p>
          <p className="mt-1 text-sm leading-relaxed text-sage-700">{note}</p>
          {gapHint ? (
            <p className="mt-3 rounded-lg bg-sand-50 px-3 py-2 text-sm leading-relaxed text-sage-600">
              {gapHint}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
