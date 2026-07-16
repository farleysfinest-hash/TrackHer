import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

type ResetStep = 'warning1' | 'warning2' | null;

interface ResetAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => Promise<{ success: boolean; error?: string }>;
}

const DELETED_ITEMS = [
  'All symptom check-ins and pulse logs',
  'Medications, doses, and lab results',
  'Symptom selections and assessments',
  'Insights and dismissed observations',
  'Your name, profile preferences, and onboarding answers',
  'Your uterus answer and preferred time zone',
];

export function ResetAccountModal({ isOpen, onClose, onReset }: ResetAccountModalProps) {
  const [step, setStep] = useState<ResetStep>(null);
  const [confirmText, setConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('warning1');
      setConfirmText('');
      setError(null);
    } else {
      setStep(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    setConfirmText('');
    setError(null);
    onClose();
  };

  const handleReset = async () => {
    setIsResetting(true);
    setError(null);
    const result = await onReset();
    setIsResetting(false);
    if (result.success) {
      window.location.href = '/onboarding';
      return;
    }
    setError(result.error ?? 'Reset failed. Please try again.');
  };

  return (
    <>
      <Modal
        isOpen={step === 'warning1'}
        onClose={handleClose}
        title="Reset your account?"
        size="md"
        closeOnBackdrop={false}
      >
        <div className="space-y-5">
          <div className="flex items-start gap-4 rounded-xl border-2 border-danger/30 bg-danger/5 p-5">
            <AlertTriangle className="mt-0.5 h-8 w-8 shrink-0 text-danger" aria-hidden />
            <div>
              <p className="text-lg font-semibold text-danger">This will erase your health data</p>
              <p className="mt-2 text-sm text-sage-600">
                Resetting your account permanently deletes every piece of TrackHer data. Your login
                and email stay active, but you will start over as if you were a new user.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-sand-50 p-4">
            <p className="text-sm font-medium text-sage-700">The following will be deleted:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-sage-600">
              {DELETED_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <p className="text-sm font-medium text-sage-700">
            This cannot be undone. Are you sure you want to continue?
          </p>

          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={handleClose}>
              Cancel — keep my data
            </Button>
            <Button variant="danger" fullWidth onClick={() => setStep('warning2')}>
              Yes, continue to reset
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={step === 'warning2'}
        onClose={handleClose}
        title="Final confirmation"
        size="md"
        closeOnBackdrop={false}
      >
        <div className="space-y-5">
          <div className="rounded-xl border-2 border-danger bg-danger/10 p-6 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-danger" aria-hidden />
            <p className="mt-4 text-xl font-bold text-danger">Last chance to stop</p>
            <p className="mt-3 text-sm text-sage-700">
              Once you reset, all tracking history, medications, labs, profile answers, preferences,
              and personalized insights are gone forever. There is no backup and no way to recover
              this data.
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm text-sage-600">
              Type <span className="font-mono font-semibold text-sage-800">RESET</span> to confirm:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type RESET"
              autoComplete="off"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={handleClose} disabled={isResetting}>
              Cancel — keep my data
            </Button>
            <Button
              variant="danger"
              fullWidth
              disabled={confirmText !== 'RESET'}
              isLoading={isResetting}
              loadingText="Resetting..."
              onClick={handleReset}
            >
              Permanently reset my account
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
