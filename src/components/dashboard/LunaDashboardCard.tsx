import { Moon } from 'lucide-react';
import { useLuna } from '../luna/LunaProvider';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export function LunaDashboardCard() {
  const {
    openDashboardLuna,
    dashboardPreview,
    hasDashboardConversation,
  } = useLuna();

  return (
    <Card variant="elevated" padding="md" className="border-sage-200 bg-sage-50/30">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-600">
          <Moon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl text-sage-800">Check in with Luna</h2>
          <p className="mt-1 text-sm leading-relaxed text-sage-600">
            Talk about how you&apos;ve been feeling, continue your conversation, or ask about your
            TrackHer data.
          </p>
          {dashboardPreview && (
            <p className="mt-2 line-clamp-2 rounded-lg bg-sand-50 px-3 py-2 text-xs leading-relaxed text-sage-500">
              Last conversation: {dashboardPreview}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void openDashboardLuna(false)}>
              {hasDashboardConversation ? 'Continue conversation' : 'Check in with Luna'}
            </Button>
            {hasDashboardConversation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void openDashboardLuna(true)}
              >
                Start fresh
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
