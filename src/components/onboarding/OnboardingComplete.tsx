import { CheckCircle } from 'lucide-react';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { CHECKIN_FREQUENCIES } from '../../lib/constants';
import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';

interface OnboardingCompleteProps {
  onGoToDashboard: () => void;
}

export function OnboardingComplete({ onGoToDashboard }: OnboardingCompleteProps) {
  const { formData } = useOnboardingStore();

  const stageLabel =
    formData.stagingResult?.strawStageLabel ??
    (formData.stagingResult?.strawStage ? `Stage ${formData.stagingResult.strawStage}` : 'Not specified');
  const frequencyLabel =
    CHECKIN_FREQUENCIES.find((f) => f.value === formData.checkinFrequency)?.label ??
    'Not specified';

  return (
    <div className="animate-fade-in space-y-6 text-center">
      <CheckCircle className="mx-auto h-16 w-16 text-success" />
      <div>
        <h1 className="font-display text-3xl text-sage-800">You&apos;re all set!</h1>
        <p className="mt-3 text-sage-500">
          Your profile is ready. Here&apos;s a quick summary of what you shared:
        </p>
      </div>

      <div className="rounded-xl border border-sand-200 bg-white p-6 text-left">
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
            <dt className="text-sage-500">Check-in frequency</dt>
            <dd className="font-medium text-sage-800">{frequencyLabel}</dd>
          </div>
          {formData.hasUterus !== null && (
            <div className="flex justify-between">
              <dt className="text-sage-500">Has uterus</dt>
              <dd className="font-medium text-sage-800">{formData.hasUterus ? 'Yes' : 'No'}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button onClick={onGoToDashboard}>Go to Dashboard</Button>
        <Link to="/medications">
          <Button variant="secondary">Add Your First Medication</Button>
        </Link>
      </div>
    </div>
  );
}
