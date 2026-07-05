interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  label?: string;
}

export function StepIndicator({ currentStep, totalSteps, label }: StepIndicatorProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="mb-6">
      <div className="mb-2 flex justify-between text-sm text-sage-500">
        <span>{label ?? `Step ${currentStep} of ${totalSteps}`}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sage-100">
        <div
          className="h-full rounded-full bg-sage-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
