import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../ui/Logo';

interface LegalPageLayoutProps {
  children: React.ReactNode;
}

export function LegalPageLayout({ children }: LegalPageLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-sand-50">
      <header className="safe-area-top border-b border-sand-200 bg-sand-50">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 pb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-sage-500 hover:text-sage-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex-1" />
          <Link to="/">
            <Logo size="sm" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="prose prose-sage max-w-none select-text">
          {children}
        </div>
      </main>

      <footer className="safe-area-bottom border-t border-sand-200 py-8">
        <div className="mx-auto max-w-3xl px-6 text-center text-xs text-sage-400">
          <p>© {new Date().getFullYear()} TrackHer. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <Link to="/privacy" className="underline hover:text-sage-600">Privacy Policy</Link>
            <Link to="/terms" className="underline hover:text-sage-600">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
