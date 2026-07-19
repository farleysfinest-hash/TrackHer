import { X, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import { useAuthStore } from '../../stores/authStore';
import { hasUiFlag, setUiFlag } from '../../lib/uiState';

export function FullDashboardUnlockCard() {
  const profile = useAuthStore((s) => s.profile);

  if (!profile) return null;
  if (profile.ui_state == null) return null;
  if (hasUiFlag(profile, 'full_dashboard_seen')) return null;

  const handleDismiss = () => {
    setUiFlag('full_dashboard_seen');
  };

  return (
    <Card variant="elevated" className="relative border-sage-200 bg-gradient-to-br from-sage-50/80 to-white">
      <button
        type="button"
        onClick={handleDismiss}
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
