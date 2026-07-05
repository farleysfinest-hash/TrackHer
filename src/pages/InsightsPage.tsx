import { Link } from 'react-router-dom';
import { Lightbulb, LayoutDashboard } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function InsightsPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <Lightbulb className="mb-4 h-12 w-12 text-sage-300" />
      <h1 className="font-display text-2xl text-sage-800">Insights</h1>
      <p className="mt-2 max-w-md text-sage-500">
        Automatic pattern detection — correlating dose changes with symptom shifts and lab
        results — is coming in Batch 6. AI-powered narratives and monthly summaries arrive in
        Batch 7.
      </p>
      <p className="mt-4 max-w-md text-sm text-sage-400">
        Charts and trends are already live on your Dashboard (Batch 5).
      </p>
      <Link to="/dashboard" className="mt-6">
        <Button variant="secondary" size="sm">
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Go to Dashboard
        </Button>
      </Link>
    </div>
  );
}
