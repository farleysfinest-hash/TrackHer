import { X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { hasUiFlag, setUiFlag } from '../../lib/uiState';
import { GROWTH_TIP_CHECKINS } from './dashboardUnlock';

interface UnlockProgressProps {
  checkinCount: number;
}

/**
 * Soft growth tip — not an unlock gate. Charts populate from check-in 1;
 * this only nudges that patterns deepen with a few more weeks.
 */
export function UnlockProgress({ checkinCount }: UnlockProgressProps) {
  const profile = useAuthStore((s) => s.profile);

  if (!profile || profile.ui_state == null) return null;
  if (hasUiFlag(profile, 'charts_growth_tip_seen')) return null;
  if (checkinCount >= GROWTH_TIP_CHECKINS) return null;

  const message =
    checkinCount === 0
      ? 'Your charts appear with your first weekly check-in — heatmap slots fill as you go.'
      : checkinCount === 1
        ? 'Nice start — each weekly score widens your timeline and fills another heatmap slot.'
        : 'One more weekly check-in and comparisons start to settle in.';

  return (
    <div className="relative flex items-start gap-3 rounded-lg border border-sand-200 bg-sand-50/50 px-4 py-3 pr-10">
      <button
        type="button"
        onClick={() => setUiFlag('charts_growth_tip_seen')}
        className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-full text-sage-400 transition-colors hover:bg-sage-100 hover:text-sage-600"
        aria-label="Dismiss tip"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="text-sm leading-relaxed text-sage-500">{message}</p>
    </div>
  );
}
