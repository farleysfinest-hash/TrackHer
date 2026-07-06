import { useOnboardingStore } from '../../stores/onboardingStore';
import type {
  PeriodsStatus,
  PeriodChanges,
  LastPeriodTimeframe,
  MenopauseCauseAnswer,
} from '../../stores/onboardingStore';
import { StrawTimeline } from './StrawTimeline';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';

interface StepStrawStagingProps {
  onNext: () => void;
  onBack: () => void;
}

interface OptionCardProps {
  label: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
}

function OptionCard({ label, description, selected, onSelect }: OptionCardProps) {
  return (
    <Card
      variant={selected ? 'elevated' : 'default'}
      padding="md"
      onClick={onSelect}
      className={selected ? 'border-sage-500 bg-sage-50 ring-2 ring-sage-500/20' : ''}
    >
      <h3 className="font-medium text-sage-800">{label}</h3>
      {description && <p className="mt-1 text-sm text-sage-500">{description}</p>}
    </Card>
  );
}

export function StepStrawStaging({ onNext, onBack }: StepStrawStagingProps) {
  const {
    stagingSubStep,
    formData,
    updateStaging,
    stagingBack,
    submitStaging,
    isSubmitting,
    error,
    updateFormData,
  } = useOnboardingStore();

  const { staging, stagingResult } = formData;

  const handleStagingBack = () => {
    if (!stagingBack()) {
      onBack();
    }
  };

  const handleContinueFromResult = async () => {
    const result = await submitStaging();
    if (result.success) onNext();
  };

  const renderQ1 = () => (
    <>
      <div>
        <h1 className="font-display text-3xl text-sage-800">
          Are you still having menstrual periods?
        </h1>
        <p className="mt-3 text-sage-500">
          Your cycle pattern helps us determine where you are on the STRAW+10 staging scale.
        </p>
      </div>
      <div className="grid gap-3">
        <OptionCard
          label="Yes, and they're regular"
          description="Cycles are predictable and haven't changed much"
          selected={staging.periodsStatus === 'regular'}
          onSelect={() => {
            updateStaging({
              periodsStatus: 'regular' as PeriodsStatus,
              periodChanges: null,
              lastPeriodTimeframe: null,
              menopauseCauseAnswer: null,
            });
            useOnboardingStore.setState({ stagingSubStep: 'result' });
          }}
        />
        <OptionCard
          label="Yes, but they've changed"
          description="Shorter, longer, or less predictable than before"
          selected={staging.periodsStatus === 'changing'}
          onSelect={() => {
            updateStaging({
              periodsStatus: 'changing' as PeriodsStatus,
              periodChanges: null,
              lastPeriodTimeframe: null,
              menopauseCauseAnswer: null,
            });
            useOnboardingStore.setState({ stagingSubStep: 'q2' });
          }}
        />
        <OptionCard
          label="No, I've stopped having periods"
          description="It's been at least a few months since my last period"
          selected={staging.periodsStatus === 'stopped'}
          onSelect={() => {
            updateStaging({
              periodsStatus: 'stopped' as PeriodsStatus,
              periodChanges: null,
              lastPeriodTimeframe: null,
              menopauseCauseAnswer: null,
            });
            useOnboardingStore.setState({ stagingSubStep: 'q3' });
          }}
        />
      </div>
    </>
  );

  const renderQ2 = () => (
    <>
      <div>
        <h1 className="font-display text-3xl text-sage-800">How have your periods changed?</h1>
        <p className="mt-3 text-sage-500">Select the pattern that best matches your experience.</p>
      </div>
      <div className="grid gap-3">
        <OptionCard
          label="My cycles are getting shorter"
          selected={staging.periodChanges === 'shorter'}
          onSelect={() => {
            updateStaging({ periodChanges: 'shorter' as PeriodChanges });
            useOnboardingStore.setState({ stagingSubStep: 'result' });
          }}
        />
        <OptionCard
          label="My cycle length varies a lot — sometimes short, sometimes long"
          selected={staging.periodChanges === 'variable'}
          onSelect={() => {
            updateStaging({ periodChanges: 'variable' as PeriodChanges });
            useOnboardingStore.setState({ stagingSubStep: 'result' });
          }}
        />
        <OptionCard
          label="I'm skipping periods entirely — going 60+ days between periods"
          selected={staging.periodChanges === 'skipping'}
          onSelect={() => {
            updateStaging({ periodChanges: 'skipping' as PeriodChanges });
            useOnboardingStore.setState({ stagingSubStep: 'result' });
          }}
        />
      </div>
    </>
  );

  const renderQ3 = () => (
    <>
      <div>
        <h1 className="font-display text-3xl text-sage-800">
          Approximately how long since your last period?
        </h1>
        <p className="mt-3 text-sage-500">
          An estimate is fine — this helps us place you on the timeline.
        </p>
      </div>
      <div className="grid gap-3">
        {(
          [
            ['less_than_12mo', 'Less than 12 months'],
            ['1_to_3yr', '1 to 3 years'],
            ['3_to_6yr', '3 to 6 years'],
            ['more_than_6yr', 'More than 6 years'],
          ] as [LastPeriodTimeframe, string][]
        ).map(([value, label]) => (
          <OptionCard
            key={value}
            label={label}
            selected={staging.lastPeriodTimeframe === value}
            onSelect={() => {
              updateStaging({
                lastPeriodTimeframe: value,
                menopauseCauseAnswer: null,
              });
              useOnboardingStore.setState({ stagingSubStep: 'q4' });
            }}
          />
        ))}
      </div>
      <Input
        label="Date of last period (optional)"
        type="date"
        value={formData.lastPeriodDate}
        onChange={(e) => updateFormData({ lastPeriodDate: e.target.value })}
        helperText="If you remember the exact date, it helps us refine your stage over time"
      />
    </>
  );

  const renderQ4 = () => (
    <>
      <div>
        <h1 className="font-display text-3xl text-sage-800">
          Was your menopause caused by surgery or medical treatment?
        </h1>
        <p className="mt-3 text-sage-500">
          This helps us understand your hormonal context more accurately.
        </p>
      </div>
      <div className="grid gap-3">
        <OptionCard
          label="Yes — surgical removal of ovaries (oophorectomy)"
          selected={staging.menopauseCauseAnswer === 'oophorectomy'}
          onSelect={() => {
            updateStaging({ menopauseCauseAnswer: 'oophorectomy' as MenopauseCauseAnswer });
            useOnboardingStore.setState({ stagingSubStep: 'result' });
          }}
        />
        <OptionCard
          label="Yes — chemotherapy, radiation, or other medical treatment"
          selected={staging.menopauseCauseAnswer === 'medical_treatment'}
          onSelect={() => {
            updateStaging({ menopauseCauseAnswer: 'medical_treatment' as MenopauseCauseAnswer });
            useOnboardingStore.setState({ stagingSubStep: 'result' });
          }}
        />
        <OptionCard
          label="Yes — hysterectomy (uterus removed, ovaries kept)"
          selected={staging.menopauseCauseAnswer === 'hysterectomy'}
          onSelect={() => {
            updateStaging({ menopauseCauseAnswer: 'hysterectomy' as MenopauseCauseAnswer });
            useOnboardingStore.setState({ stagingSubStep: 'result' });
          }}
        />
        <OptionCard
          label="No — it happened naturally"
          selected={staging.menopauseCauseAnswer === 'natural'}
          onSelect={() => {
            updateStaging({ menopauseCauseAnswer: 'natural' as MenopauseCauseAnswer });
            useOnboardingStore.setState({ stagingSubStep: 'result' });
          }}
        />
        <OptionCard
          label="I'm not sure"
          selected={staging.menopauseCauseAnswer === 'unsure'}
          onSelect={() => {
            updateStaging({ menopauseCauseAnswer: 'unsure' as MenopauseCauseAnswer });
            useOnboardingStore.setState({ stagingSubStep: 'result' });
          }}
        />
      </div>
    </>
  );

  const renderResult = () => {
    if (!stagingResult) return null;
    return (
      <>
        <div>
          <h1 className="font-display text-3xl text-sage-800">Here&apos;s where you are</h1>
          <p className="mt-3 text-sage-500">
            Based on your answers, this is your current STRAW+10 stage.
          </p>
        </div>
        <StrawTimeline
          stage={stagingResult.strawStage}
          stageLabel={stagingResult.strawStageLabel}
          description={stagingResult.description}
        />
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="animate-slide-in" key={stagingSubStep}>
        {stagingSubStep === 'q1' && renderQ1()}
        {stagingSubStep === 'q2' && renderQ2()}
        {stagingSubStep === 'q3' && renderQ3()}
        {stagingSubStep === 'q4' && renderQ4()}
        {stagingSubStep === 'result' && renderResult()}
      </div>

      {error && (
        <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={handleStagingBack} className="flex-1">
          Back
        </Button>
        {stagingSubStep === 'result' && (
          <Button
            disabled={!stagingResult}
            isLoading={isSubmitting}
            loadingText="Saving..."
            onClick={handleContinueFromResult}
            className="flex-1"
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}
