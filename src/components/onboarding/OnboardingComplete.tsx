import { CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useReminderSettings } from '../../hooks/useReminderSync';
import { isNativeNotificationsAvailable } from '../../lib/localNotifications';
import { Button } from '../ui/Button';

interface OnboardingCompleteProps {
  onGoToDashboard: () => void;
}

export function OnboardingComplete({ onGoToDashboard }: OnboardingCompleteProps) {
  const navigate = useNavigate();
  const { formData } = useOnboardingStore();
  const { enableReminders, permission, prefs, updatePrefs } = useReminderSettings();
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);
  const [dismissedPrompt, setDismissedPrompt] = useState(false);
  const showReminderPrompt =
    isNativeNotificationsAvailable() &&
    permission !== 'granted' &&
    !prefs.asked &&
    !dismissedPrompt;

  const stageLabel =
    formData.stagingResult?.strawStageLabel ??
    (formData.stagingResult?.strawStage ? `Stage ${formData.stagingResult.strawStage}` : 'Not specified');

  const checkinDayLabel = (() => {
    // Convention: 0 = Sunday ... 6 = Saturday (matches JS Date#getDay()).
    const labels: Record<number, string> = {
      0: 'Sunday',
      1: 'Monday',
      2: 'Tuesday',
      3: 'Wednesday',
      4: 'Thursday',
      5: 'Friday',
      6: 'Saturday',
    };
    if (formData.checkinDay === null) return 'Any day';
    return labels[formData.checkinDay] ?? 'Any day';
  })();

  const handleEnableReminders = async () => {
    setReminderBusy(true);
    setReminderMessage(null);
    try {
      const state = await enableReminders();
      if (state === 'granted') {
        setReminderMessage('Reminders are on. You can change them anytime in Settings.');
      } else if (state === 'denied') {
        setReminderMessage('Notifications stay off for now. You can enable them later in Settings.');
      }
    } finally {
      setReminderBusy(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6 text-center">
      <CheckCircle className="mx-auto h-16 w-16 text-success" />
      <div>
        <h1 className="font-display text-3xl text-sage-800">You&apos;re all set!</h1>
        <p className="mt-3 text-sage-500">
          Your profile is ready. Here&apos;s a quick summary of what you shared:
        </p>
      </div>

      <div className="rounded-xl border border-sand-200 bg-sand-50 p-6 text-left">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-sage-500">Name</dt>
            <dd className="font-medium text-sage-800">{formData.displayName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sage-500">STRAW+10 stage</dt>
            <dd className="font-medium text-sage-800">{stageLabel}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sage-500">Symptoms tracked</dt>
            <dd className="font-medium text-sage-800">{formData.selectedSymptoms.length}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sage-500">Watch symptoms</dt>
            <dd className="font-medium text-sage-800">{formData.watchSymptoms.length}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sage-500">Weekly check-in day</dt>
            <dd className="font-medium text-sage-800">{checkinDayLabel}</dd>
          </div>
          {formData.hasUterusConfirmed && (
            <div className="flex justify-between">
              <dt className="text-sage-500">Uterus</dt>
              <dd className="font-medium text-sage-800">
                {formData.hasUterus === true ? 'Yes' : formData.hasUterus === false ? 'No' : 'Not sure yet'}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {showReminderPrompt && (
        <div className="rounded-xl border border-sage-200 bg-sage-50 p-5 text-left">
          <h2 className="font-display text-lg text-sage-800">Get a gentle nudge</h2>
          <p className="mt-2 text-sm text-sage-600">
            Turn on local reminders for your weekly check-in
            {formData.checkinDay !== null ? ` on ${checkinDayLabel}s` : ''} and your doses. They stay
            on your phone—we never send them through an external service.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => void handleEnableReminders()}
              isLoading={reminderBusy}
              loadingText="Enabling..."
            >
              Enable reminders
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDismissedPrompt(true);
                void updatePrefs({ asked: true });
              }}
              disabled={reminderBusy}
            >
              Not now
            </Button>
          </div>
          {reminderMessage && <p className="mt-3 text-sm text-sage-600">{reminderMessage}</p>}
        </div>
      )}

      {reminderMessage && !showReminderPrompt && (
        <p className="text-sm text-sage-600">{reminderMessage}</p>
      )}

      <p className="text-sm text-sage-500">
        Your first check-in takes about two minutes and gives you your baseline score.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button onClick={() => navigate('/checkin')}>Do your first check-in</Button>
        <Button variant="secondary" onClick={onGoToDashboard}>
          Explore the dashboard first
        </Button>
      </div>
    </div>
  );
}
