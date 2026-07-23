import { X, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import { useAuthStore } from '../../stores/authStore';
import { hasUiFlag, setUiFlag } from '../../lib/uiState';

const FULL_DASHBOARD_CHECKINS = 7;

function getUnlockMessage(checkinCount: number): string | null {
  if (checkinCount >= FULL_DASHBOARD_CHECKINS) return null;
  if (checkinCount < 2) {
    const remaining = 2 - checkinCount;
    return remaining === 1
      ? '1 more check-in unlocks your first comparison'
      : `${remaining} more check-ins unlock your first comparison`;
  }
  if (checkinCount < 3) {
    const remaining = 3 - checkinCount;
    return remaining === 1
      ? '1 more check-in unlocks trend detection'
      : `${remaining} more check-ins unlock trend detection`;
  }
  const remaining = FULL_DASHBOARD_CHECKINS - checkinCount;
  return remaining === 1
    ? '1 more check-in unlocks your symptom heatmap and full dashboard'
    : `${remaining} more check-ins unlock your symptom heatmap and full dashboard`;
}

interface UnlockProgressProps {
  checkinCount: number;
}

export function UnlockProgress({ checkinCount }: UnlockProgressProps) {
  const profile = useAuthStore((s) => s.profile);

  if (checkinCount >= FULL_DASHBOARD_CHECKINS) {
    if (!profile || profile.ui_state == null) return null;
    if (hasUiFlag(profile, 'full_dashboard_seen')) return null;

    return (
      <Card variant="elevated" className="relative border-sage-200 bg-sage-50">
        <button
          type="button"
          onClick={() => setUiFlag('full_dashboard_seen')}
          className="absolute right-4 top-4 rounded-full p-1 text-sage-400 transition-colors hover:bg-sage-100 hover:text-sage-600"
          aria-label="Dismiss unlock message"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex gap-3 pr-8">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-sage-500" />
          <div>
            <h2 className="font-display text-lg text-sage-800">Your full dashboard is unlocked</h2>
            <p className="mt-2 text-sm leading-relaxed text-sage-600">
              You&apos;ve built enough history for trends, your symptom heatmap, and deeper charts.
              This is where patterns start becoming visible.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const message = getUnlockMessage(checkinCount);
  if (!message) return null;

  const progress = Math.min(checkinCount / FULL_DASHBOARD_CHECKINS, 1);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-sand-200 bg-sand-50/50 px-4 py-3">
      <div
        className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-sage-100"
        role="progressbar"
        aria-valuenow={checkinCount}
        aria-valuemin={0}
        aria-valuemax={FULL_DASHBOARD_CHECKINS}
        aria-label="Check-in progress toward full dashboard"
      >
        <div
          className="h-full rounded-full bg-sage-400 transition-all duration-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className="text-sm text-sage-500">{message}</p>
    </div>
  );
}
