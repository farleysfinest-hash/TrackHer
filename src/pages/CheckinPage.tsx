import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useCheckinStatus } from '../hooks/useCheckinStatus';
import { useCheckins } from '../hooks/useCheckins';
import { useCheckinStore } from '../stores/checkinStore';
import { CheckinFlow } from '../components/checkin/CheckinFlow';
import { CheckinHistory } from '../components/checkin/CheckinHistory';
import { CheckinDetailModal } from '../components/checkin/CheckinDetailModal';
import { MRSScoreBadge } from '../components/checkin/MRSScoreBadge';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { hasMRSData } from '../utils/checkinHelpers';
import type { SymptomCheckin } from '../types/database';

export function CheckinPage() {
  const { hasCheckedInToday, todaysCheckin, refresh, isLoading } = useCheckinStatus();
  const { fetchCheckinDetail, getTodaysCheckin } = useCheckins();
  const setMode = useCheckinStore((s) => s.setMode);
  const reset = useCheckinStore((s) => s.reset);
  const loadExistingCheckin = useCheckinStore((s) => s.loadExistingCheckin);

  const [activeFlow, setActiveFlow] = useState(false);
  const [showDuplicatePrompt, setShowDuplicatePrompt] = useState(false);
  const [pendingMode, setPendingMode] = useState<'full' | 'quick'>('full');
  const [detailCheckin, setDetailCheckin] = useState<SymptomCheckin | null>(null);

  const startFullFromPulse = async (today: SymptomCheckin) => {
    const detail = await fetchCheckinDetail(today.id);
    if (detail) {
      reset();
      setMode('full');
      loadExistingCheckin(detail.checkin, detail.extendedSymptoms);
      setActiveFlow(true);
    }
  };

  const startCheckin = async (mode: 'full' | 'quick') => {
    const today = await getTodaysCheckin();
    if (today) {
      if (today.checkin_type === 'pulse' && mode === 'full') {
        await startFullFromPulse(today);
        return;
      }
      setPendingMode(mode);
      setShowDuplicatePrompt(true);
      return;
    }
    reset();
    setMode(mode);
    setActiveFlow(true);
  };

  const handleUpdateExisting = async () => {
    const today = todaysCheckin ?? (await getTodaysCheckin());
    if (!today) return;
    const detail = await fetchCheckinDetail(today.id);
    if (detail) {
      reset();
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
      setMode('full');
      loadExistingCheckin(detail.checkin, detail.extendedSymptoms);
      setActiveFlow(true);
    }
  };

  const handleFlowComplete = () => {
    setActiveFlow(false);
    void refresh();
  };

  if (activeFlow) {
    return <CheckinFlow onClose={() => setActiveFlow(false)} onComplete={handleFlowComplete} />;
  }

  const todaysIsPulse = todaysCheckin?.checkin_type === 'pulse';

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl text-sage-800">Check In</h1>
        <p className="mt-1 text-sage-500">Track your symptoms and wellbeing over time.</p>
      </div>

      {!isLoading && hasCheckedInToday && todaysCheckin ? (
        <Card variant="elevated">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
              <div>
                <h2 className="font-display text-lg text-sage-800">
                  {todaysIsPulse ? 'Pulse logged today' : "You've already checked in today"}
                </h2>
                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                  {todaysCheckin.overall_wellbeing !== null && (
                    <span className="text-sage-600">
                      Wellbeing: {todaysCheckin.overall_wellbeing}/10
                    </span>
                  )}
                  {hasMRSData(todaysCheckin) && (
                    <MRSScoreBadge total={todaysCheckin.total_score} compact showDot />
                  )}
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
                  void handleUpdateExisting();
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
        isOpen={showDuplicatePrompt}
        onClose={() => setShowDuplicatePrompt(false)}
        title="Already checked in today"
        size="sm"
      >
        <p className="text-sm text-sage-600">
          You&apos;ve already checked in today. Would you like to update your existing check-in?
        </p>
        <div className="mt-4 flex gap-3">
          <Button onClick={() => void handleUpdateExisting()}>Update Today&apos;s Check-in</Button>
          <Button variant="secondary" onClick={() => setShowDuplicatePrompt(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
