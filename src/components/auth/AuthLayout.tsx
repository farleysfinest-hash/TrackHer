import { Outlet, Link } from 'react-router-dom';
import { Logo } from '../ui/Logo';
import { MedicalDisclaimer } from '../ui/MedicalDisclaimer';
import { Card } from '../ui/Card';

export function AuthLayout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sand-50 px-6 py-12">
      <div className="mb-8">
        <Logo size="lg" />
      </div>
      <Card variant="elevated" className="w-full max-w-[480px]">
        {children ?? <Outlet />}
      </Card>
      <div className="mt-8 max-w-[480px] text-center">
        <MedicalDisclaimer variant="inline" />
        <p className="mt-4 text-xs text-sage-400">
          <Link to="/privacy" className="underline hover:text-sage-600">
            Privacy Policy
          </Link>
          {' · '}
          <Link to="/terms" className="underline hover:text-sage-600">
            Terms of Service
          </Link>
        </p>
      </div>
    </div>
  );
}
