import { Logo } from '../components/ui/Logo';
import { OnboardingWizard } from '../components/onboarding/OnboardingWizard';

export function OnboardingPage() {
  return (
    <div className="min-h-screen bg-sand-50">
      <div className="border-b border-sand-200 bg-white px-6 py-4">
        <Logo />
      </div>
      <OnboardingWizard />
    </div>
  );
}
