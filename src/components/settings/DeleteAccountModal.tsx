import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => Promise<{ success: boolean; error?: string }>;
}

export function DeleteAccountModal({ isOpen, onClose, onDelete }: DeleteAccountModalProps) {
  const [step, setStep] = useState<'warning' | 'confirm' | 'deleted' | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('warning');
      setConfirmText('');
      setError(null);
    } else if (step !== 'deleted') {
      setStep(null);
    }
  }, [isOpen, step]);

  const handleClose = () => {
    setConfirmText('');
    setError(null);
    onClose();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    const result = await onDelete();
    setIsDeleting(false);
    if (result.success) {
      setStep('deleted');
      return;
    }
    setError(result.error ?? 'Deletion failed. Please try again.');
  };

  const goToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <>
      <Modal
        isOpen={step === 'warning'}
        onClose={handleClose}
        title="Delete your account?"
        size="md"
        closeOnBackdrop={false}
      >
        <div className="space-y-5">
          <div className="flex items-start gap-4 rounded-xl border-2 border-danger/30 bg-danger/5 p-5">
            <AlertTriangle className="mt-0.5 h-8 w-8 shrink-0 text-danger" aria-hidden />
            <div>
              <p className="text-lg font-semibold text-danger">
                This permanently deletes your account
              </p>
              <p className="mt-2 text-sm text-sage-600">
                Unlike a reset, this removes your login entirely. You will not be
                able to sign back in, and there is no way to recover your data.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-sand-50 p-4">
            <p className="text-sm font-medium text-sage-700">
              Everything will be permanently removed:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-sage-600">
              <li>All symptom check-ins, pulse logs, and quick logs</li>
              <li>Medications, dose history, and lab results</li>
              <li>Insights, assessments, and provider reports</li>
              <li>Your profile, preferences, and login credentials</li>
            </ul>
          </div>

          <p className="text-sm text-sage-600">
            If you want to keep your login but start fresh, use{' '}
            <span className="font-medium text-sage-700">Reset Account</span> instead.
          </p>

          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={handleClose}>
              Cancel — keep my account
            </Button>
            <Button variant="danger" fullWidth onClick={() => setStep('confirm')}>
              Yes, delete everything
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={step === 'confirm'}
        onClose={handleClose}
        title="Final confirmation"
        size="md"
        closeOnBackdrop={false}
      >
        <div className="space-y-5">
          <div className="rounded-xl border-2 border-danger bg-danger/10 p-6 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-danger" aria-hidden />
            <p className="mt-4 text-xl font-bold text-danger">This cannot be undone</p>
            <p className="mt-3 text-sm text-sage-700">
              Your account, login, and all health data will be permanently deleted.
              You will need to create a new account to use TrackHer again.
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm text-sage-600">
              Type <span className="font-mono font-semibold text-sage-800">DELETE</span> to confirm:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              autoComplete="off"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={handleClose} disabled={isDeleting}>
              Cancel — keep my account
            </Button>
            <Button
              variant="danger"
              fullWidth
              disabled={confirmText !== 'DELETE'}
              isLoading={isDeleting}
              loadingText="Deleting..."
              onClick={handleDelete}
            >
              Permanently delete my account
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={step === 'deleted'}
        onClose={goToLogin}
        title="Account deleted"
        size="md"
        closeOnBackdrop={false}
      >
        <div className="space-y-5 text-center">
          <p className="text-sage-700">
            Your account and all associated data have been permanently removed.
          </p>
          <Button variant="secondary" fullWidth onClick={goToLogin}>
            Go to login
          </Button>
        </div>
      </Modal>
    </>
  );
}
