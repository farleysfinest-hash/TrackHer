import { useEffect, useState } from 'react';
import { useCheckinStatus } from '../hooks/useCheckinStatus';
import { useCheckins } from '../hooks/useCheckins';
import { useCheckinStore } from '../stores/checkinStore';
import { useAuthStore } from '../stores/authStore';
import { CheckinFlow } from '../components/checkin/CheckinFlow';
import { CheckinHistory } from '../components/checkin/CheckinHistory';
import { RecentLogs } from '../components/checkin/RecentLogs';
import { CheckinDetailModal } from '../components/checkin/CheckinDetailModal';
import {
  PulsePromptCard,
  WeeklyCheckinPromptCard,
} from '../components/checkin/CheckinPromptWidget';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { getLocalDateISO, getResolvedTimezone } from '../utils/checkinHelpers';
import { formatLoggingDate } from '../utils/formatters';
import { isValidCalendarDate } from '../utils/localDate';
import type { SymptomCheckin, CheckinDraft } from '../types/database';
import { clearCheckinDraft, loadCheckinDraft } from '../lib/checkinDraft';
import { useLocation, useNavigate } from 'react-router-dom';

export function CheckinPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    hasCheckedInToday,
    todaysCheckin,
    weeklyMinimumMet,
    refresh,
    isLoading,
    hasPulseToday,
    hasFullMrsToday,
    isDue,
    daysSinceLastCheckin,
  } = useCheckinStatus();
  const { fetchCheckinDetail, getCheckinForDate } = useCheckins();
  const setMode = useCheckinStore((s) => s.setMode);
  const setTargetDate = useCheckinStore((s) => s.setTargetDate);
  const reset = useCheckinStore((s) => s.reset);
  const loadExistingCheckin = useCheckinStore((s) => s.loadExistingCheckin);
  const hydrateFromDraft = useCheckinStore((s) => s.hydrateFromDraft);
  const userId = useAuthStore((s) => s.user?.id);
  const timezone = getResolvedTimezone(useAuthStore((s) => s.profile?.timezone));
  const todayStr = getLocalDateISO(timezone);

  const [activeFlow, setActiveFlow] = useState(false);
  const [showDuplicatePrompt, setShowDuplicatePrompt] = useState(false);
  const [pendingMode, setPendingMode] = useState<'full' | 'quick'>('full');
  const [duplicateDate, setDuplicateDate] = useState(todayStr);
  const [detailCheckin, setDetailCheckin] = useState<SymptomCheckin | null>(null);
  const [showBackdate, setShowBackdate] = useState(false);
  const [backdateValue, setBackdateValue] = useState('');
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<CheckinDraft | null>(null);
  const [pendingStartMode, setPendingStartMode] = useState<'full' | 'quick'>('full');
  const [pendingStartDate, setPendingStartDate] = useState(todayStr);
  const [historyReloadToken, setHistoryReloadToken] = useState(0);

  const backdateValid = isValidCalendarDate(backdateValue) && backdateValue <= todayStr;
  const resolveTargetDate = () => (backdateValid ? backdateValue : todayStr);

  const startFullFromPulse = async (existing: SymptomCheckin) => {
    const detail = await fetchCheckinDetail(existing.id);
    if (detail) {
      reset();
      setTargetDate(existing.checkin_date);
      setMode('full');
      loadExistingCheckin(detail.checkin, detail.extendedSymptoms);
      setActiveFlow(true);
    }
  };

  const startCheckin = async (mode: 'full' | 'quick') => {
    const targetDate = resolveTargetDate();
    const existing = await getCheckinForDate(targetDate);

    if (existing) {
      if (existing.checkin_type === 'pulse' && mode === 'full' && targetDate === todayStr) {
        await startFullFromPulse(existing);
        return;
      }
      setPendingMode(mode);
      setDuplicateDate(targetDate);
      setShowDuplicatePrompt(true);
      return;
    }

    if (userId) {
      const draft = await loadCheckinDraft(userId, targetDate, mode);
      if (draft) {
        setPendingDraft(draft);
        setPendingStartMode(mode);
        setPendingStartDate(targetDate);
        setShowResumePrompt(true);
        return;
      }
    }

    reset();
    setTargetDate(targetDate);
    setMode(mode);
    setActiveFlow(true);
  };

  const handleUpdateExisting = async (date?: string) => {
    const targetDate = date ?? duplicateDate;
    const existing = await getCheckinForDate(targetDate);
    if (!existing) return;
    const detail = await fetchCheckinDetail(existing.id);
    if (detail) {
      reset();
      setTargetDate(targetDate);
      setMode(pendingMode);
      loadExistingCheckin(detail.checkin, detail.extendedSymptoms);
      setShowDuplicatePrompt(false);
      setActiveFlow(true);
    }
  };

  const handleEditFromDetail = async (checkin: SymptomCheckin) => {
    const detail = await fetchCheckinDetail(checkin.id);
    if (detail) {
      setDetailCheckin(null);
      reset();
      setTargetDate(checkin.checkin_date);
      setMode('full');
      loadExistingCheckin(detail.checkin, detail.extendedSymptoms);
      setActiveFlow(true);
    }
  };

  const handleFlowComplete = () => {
    setActiveFlow(false);
    setShowBackdate(false);
    setBackdateValue('');
    setShowResumePrompt(false);
    setPendingDraft(null);
    void refresh();
  };

  const handleResumeDraft = () => {
    if (!pendingDraft) return;
    hydrateFromDraft(pendingDraft.payload, pendingDraft.target_date, pendingDraft.mode);
    setShowResumePrompt(false);
    setPendingDraft(null);
    setActiveFlow(true);
  };

  const handleStartFresh = async () => {
    if (userId && pendingDraft) {
      await clearCheckinDraft(userId, pendingDraft.target_date, pendingDraft.mode);
    }
    reset();
    setTargetDate(pendingStartDate);
    setMode(pendingStartMode);
    setShowResumePrompt(false);
    setPendingDraft(null);
    setActiveFlow(true);
  };

  useEffect(() => {
    if (activeFlow) return;
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode');
    if (mode !== 'quick' && mode !== 'full') return;

    // Deep-link / notification entry still auto-starts.
    void startCheckin(mode);
    navigate('/checkin', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, activeFlow]);

  if (activeFlow) {
    return <CheckinFlow onClose={() => setActiveFlow(false)} onComplete={handleFlowComplete} />;
  }

  return (
    <div className="min-w-0 space-y-10 overflow-x-hidden">
      <div className="min-w-0">
        <h1 className="font-display text-3xl text-sage-800">Check In</h1>
        <p className="mt-1 text-sage-500">
          Daily pulse keeps the day alive. Weekly check-in is the clinical symptom scale — once a
          week is the minimum; more is better.
        </p>
      </div>

      <WeeklyCheckinPromptCard
        hasFullMrsToday={hasFullMrsToday}
        weeklyMinimumMet={weeklyMinimumMet}
        isDue={isDue}
        todaysCheckin={todaysCheckin}
        daysSinceLastCheckin={daysSinceLastCheckin}
        isLoading={isLoading}
        onStart={() => void startCheckin('full')}
      />

      <PulsePromptCard
        hasCheckedInToday={hasCheckedInToday}
        hasPulseToday={hasPulseToday}
        hasFullMrsToday={hasFullMrsToday}
        todaysCheckin={todaysCheckin}
        isLoading={isLoading}
        onStart={() => void startCheckin('quick')}
      />

      <div>
        {!showBackdate ? (
          <button
            type="button"
            onClick={() => setShowBackdate(true)}
            className="text-sm text-sage-500 underline hover:text-sage-700"
          >
            Logging for a past day?
          </button>
        ) : (
          <div className="max-w-xs">
            <Input
              label="Check-in date"
              type="date"
              value={backdateValue}
              max={todayStr}
              onChange={(e) => setBackdateValue(e.target.value)}
            />
            {!backdateValid && (
              <p className="mt-2 text-sm text-amber-700">
                Finish picking a date, or go back to today — check-ins started now would be logged
                for today.
              </p>
            )}
            {backdateValid && backdateValue < todayStr && (
              <p className="mt-2 text-sm text-sage-600">
                Logging for {formatLoggingDate(backdateValue)}. Use the cards above to start.
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setShowBackdate(false);
                setBackdateValue('');
              }}
              className="mt-2 text-sm text-sage-500 underline hover:text-sage-700"
            >
              Back to today
            </button>
          </div>
        )}
      </div>

      <RecentLogs />

      <CheckinHistory onViewDetails={setDetailCheckin} reloadToken={historyReloadToken} />

      <CheckinDetailModal
        checkin={detailCheckin}
        isOpen={!!detailCheckin}
        onClose={() => setDetailCheckin(null)}
        onEdit={handleEditFromDetail}
        onDeleted={() => {
          setHistoryReloadToken((t) => t + 1);
          void refresh();
        }}
      />

      <Modal
        isOpen={showResumePrompt}
        onClose={() => setShowResumePrompt(false)}
        title="You have an unfinished check-in"
        size="sm"
      >
        <p className="text-sm text-sage-600">
          You started a check-in for{' '}
          {pendingDraft ? formatLoggingDate(pendingDraft.target_date) : 'this day'} and didn't
          finish it. Your answers are still here.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button onClick={handleResumeDraft}>Pick up where I left off</Button>
          <Button variant="secondary" onClick={() => void handleStartFresh()}>
            Start fresh
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={showDuplicatePrompt}
        onClose={() => setShowDuplicatePrompt(false)}
        title={
          duplicateDate === todayStr
            ? 'Already checked in today'
            : `Already checked in on ${formatLoggingDate(duplicateDate)}`
        }
        size="sm"
      >
        <p className="text-sm text-sage-600">
          {duplicateDate === todayStr
            ? "You've already checked in today. Would you like to update your existing check-in?"
            : `You already have a check-in for ${formatLoggingDate(duplicateDate)}. Would you like to update it?`}
        </p>
        <div className="mt-4 flex gap-3">
          <Button onClick={() => void handleUpdateExisting()}>
            {duplicateDate === todayStr ? "Update Today's Check-in" : 'Update Check-in'}
          </Button>
          <Button variant="secondary" onClick={() => setShowDuplicatePrompt(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
