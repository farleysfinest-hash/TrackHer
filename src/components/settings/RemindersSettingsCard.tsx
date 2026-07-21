import { Bell, BellOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { useReminderSettings } from '../../hooks/useReminderSync';

export function RemindersSettingsCard() {
  const {
    available,
    permission,
    prefs,
    isSyncing,
    enableReminders,
    updatePrefs,
  } = useReminderSettings();

  if (!available) {
    return (
      <Card>
        <h2 className="font-display text-xl text-sage-800">Reminders</h2>
        <p className="mt-2 text-sm text-sage-500">
          Dose and check-in reminders are available in the TrackHer iOS app. They stay on your
          device—we never send them through an external notification service.
        </p>
      </Card>
    );
  }

  const denied = permission === 'denied';
  const granted = permission === 'granted';

  return (
    <Card>
      <div className="flex items-start gap-3">
        {granted && prefs.checkinEnabled ? (
          <Bell className="mt-0.5 h-5 w-5 shrink-0 text-sage-600" aria-hidden />
        ) : (
          <BellOff className="mt-0.5 h-5 w-5 shrink-0 text-sage-400" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl text-sage-800">Reminders</h2>
          <p className="mt-1 text-sm text-sage-500">
            Local reminders for your weekly check-in and daily doses. Free forever.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {!granted && !denied && (
          <Button onClick={() => void enableReminders()} isLoading={isSyncing} loadingText="Enabling...">
            Enable reminders
          </Button>
        )}

        {denied && (
          <p className="text-sm text-amber-800">
            Notifications are off for TrackHer. Enable them in iOS Settings → TrackHer → Notifications,
            then return here.
          </p>
        )}

        {granted && (
          <>
            <label className="flex items-center justify-between gap-4 text-sm text-sage-700">
              <span>Weekly check-in reminder</span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-sage-600"
                checked={prefs.checkinEnabled}
                onChange={(e) => void updatePrefs({ checkinEnabled: e.target.checked })}
              />
            </label>

            {prefs.checkinEnabled && (
              <Input
                label="Check-in reminder time"
                type="time"
                value={prefs.checkinTime}
                onChange={(e) => void updatePrefs({ checkinTime: e.target.value || '09:00' })}
              />
            )}

            <label className="flex items-center justify-between gap-4 text-sm text-sage-700">
              <span>Medication dose reminders</span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-sage-600"
                checked={prefs.medsEnabled}
                onChange={(e) => void updatePrefs({ medsEnabled: e.target.checked })}
              />
            </label>
          </>
        )}
      </div>
    </Card>
  );
}
