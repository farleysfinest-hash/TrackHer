import { Logo } from '../components/ui/Logo';
import { OnboardingWizard } from '../components/onboarding/OnboardingWizard';

export function OnboardingPage() {
  return (
    <div className="min-h-screen bg-sand-50">
      <div className="safe-area-top border-b border-sand-200 bg-white px-6 pb-4">
        <Logo />
      </div>
      <OnboardingWizard />
    </div>
  );
}
