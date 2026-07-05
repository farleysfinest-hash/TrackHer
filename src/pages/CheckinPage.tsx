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
import type { SymptomCheckin } from '../types/database';

export function CheckinPage() {
  const { hasCheckedInToday, todaysCheckin, refresh, isLoading } = useCheckinStatus();
  const { fetchCheckinDetail, getTodaysCheckin } = useCheckins();
  const { setMode, reset, loadExistingCheckin } = useCheckinStore();

  const [activeFlow, setActiveFlow] = useState(false);
  const [showDuplicatePrompt, setShowDuplicatePrompt] = useState(false);
  const [pendingMode, setPendingMode] = useState<'full' | 'quick'>('full');
  const [detailCheckin, setDetailCheckin] = useState<SymptomCheckin | null>(null);

  const startCheckin = async (mode: 'full' | 'quick') => {
    const today = await getTodaysCheckin();
    if (today) {
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
                  You&apos;ve already checked in today
                </h2>
                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                  {todaysCheckin.overall_wellbeing !== null && (
                    <span className="text-sage-600">
                      Wellbeing: {todaysCheckin.overall_wellbeing}/10
                    </span>
                  )}
                  <MRSScoreBadge total={todaysCheckin.total_score} compact showDot />
                </div>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setPendingMode('full');
                void handleUpdateExisting();
              }}
            >
              Edit
            </Button>
          </div>
        </Card>
      ) : (
        !isLoading && (
          <Card variant="elevated" padding="lg">
            <h2 className="font-display text-xl text-sage-800">How are you feeling?</h2>
            <p className="mt-2 text-sage-500">
              Take a moment to log your symptoms. It only takes about 90 seconds.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => void startCheckin('full')}>Full Check-in</Button>
              <Button variant="secondary" onClick={() => void startCheckin('quick')}>
                Quick Check-in
              </Button>
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
