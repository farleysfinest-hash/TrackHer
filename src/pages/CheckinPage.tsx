import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useCheckinStatus } from '../hooks/useCheckinStatus';
import { useCheckins } from '../hooks/useCheckins';
import { useCheckinStore } from '../stores/checkinStore';
import { useAuthStore } from '../stores/authStore';
import { CheckinFlow } from '../components/checkin/CheckinFlow';
import { CheckinHistory } from '../components/checkin/CheckinHistory';
import { CheckinDetailModal } from '../components/checkin/CheckinDetailModal';
import { MrsScoreDisplay } from '../components/checkin/MrsScoreDisplay';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { getLocalDateISO, getResolvedTimezone } from '../utils/checkinHelpers';
import { DailyChannelsDisplay } from '../components/ui/DailyChannelsDisplay';
import { formatLoggingDate } from '../utils/formatters';
import type { SymptomCheckin } from '../types/database';
import type { CheckinDraft } from '../lib/checkinDraft';
import { clearCheckinDraft, loadCheckinDraft } from '../lib/checkinDraft';
import { useLocation, useNavigate } from 'react-router-dom';

export function CheckinPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasCheckedInToday, todaysCheckin, refresh, isLoading } = useCheckinStatus();
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

  const resolveTargetDate = () => (backdateValue && backdateValue <= todayStr ? backdateValue : todayStr);

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
      const draft = loadCheckinDraft(userId, targetDate, mode);
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
    hydrateFromDraft(pendingDraft);
    setShowResumePrompt(false);
    setPendingDraft(null);
    setActiveFlow(true);
  };

  const handleStartFresh = () => {
    clearCheckinDraft();
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

    // Auto-start from dashboard prompt.
    void startCheckin(mode);
    navigate('/checkin', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, activeFlow]);

  if (activeFlow) {
    return <CheckinFlow onClose={() => setActiveFlow(false)} onComplete={handleFlowComplete} />;
  }

  const todaysIsPulse = todaysCheckin?.checkin_type === 'pulse';
  const loggingForPastDay = backdateValue && backdateValue < todayStr;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl text-sage-800">Check In</h1>
        <p className="mt-1 text-sage-500">Track your symptoms and daily pulse over time.</p>
      </div>

      {!isLoading && hasCheckedInToday && todaysCheckin && !loggingForPastDay ? (
        <Card variant="elevated">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
              <div>
                <h2 className="font-display text-lg text-sage-800">
                  {todaysIsPulse ? 'Pulse logged today' : "You've already checked in today"}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                  <DailyChannelsDisplay checkin={todaysCheckin} />
                  <MrsScoreDisplay checkin={todaysCheckin} compact showDot />
                </div>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                if (todaysIsPulse) {
                  void startFullFromPulse(todaysCheckin);
                } else {
                  setPendingMode('full');
                  void handleUpdateExisting(todayStr);
                }
              }}
            >
              {todaysIsPulse ? 'Complete full check-in' : 'Edit'}
            </Button>
          </div>
        </Card>
      ) : (
        !isLoading && (
          <Card variant="elevated" padding="lg">
            <h2 className="font-display text-xl text-sage-800">How are you feeling?</h2>
            {loggingForPastDay && (
              <p className="mt-2 text-sm text-sage-600">
                Logging for {formatLoggingDate(backdateValue)}
              </p>
            )}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void startCheckin('full')}
                className="rounded-xl border border-sand-200 bg-white p-4 text-left transition hover:border-sage-300 hover:bg-sage-50/50"
              >
                <p className="font-display text-lg text-sage-800">Full check-in (~2 min)</p>
                <p className="mt-1 text-sm text-sage-500">
                  Rate your symptoms on the clinical scale
                </p>
              </button>
              <button
                type="button"
                onClick={() => void startCheckin('quick')}
                className="rounded-xl border border-sand-200 bg-white p-4 text-left transition hover:border-sage-300 hover:bg-sage-50/50"
              >
                <p className="font-display text-lg text-sage-800">Quick pulse (~10 sec)</p>
                <p className="mt-1 text-sm text-sage-500">Just log how you feel overall today</p>
              </button>
            </div>
            <div className="mt-4">
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
          </Card>
        )
      )}

      <CheckinHistory onViewDetails={setDetailCheckin} />

      <CheckinDetailModal
        checkin={detailCheckin}
        isOpen={!!detailCheckin}
        onClose={() => setDetailCheckin(null)}
        onEdit={handleEditFromDetail}
        onDeleted={() => void refresh()}
      />

      <Modal
        isOpen={showResumePrompt}
        onClose={() => setShowResumePrompt(false)}
        title="You have an unfinished check-in"
        size="sm"
      >
        <p className="text-sm text-sage-600">
          You started a check-in for{' '}
          {pendingDraft ? formatLoggingDate(pendingDraft.targetDate) : 'this day'} and didn't
          finish it. Your answers are still here.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button onClick={handleResumeDraft}>Pick up where I left off</Button>
          <Button variant="secondary" onClick={handleStartFresh}>
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
