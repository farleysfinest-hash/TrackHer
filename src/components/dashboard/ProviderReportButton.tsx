import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '../ui/Button';
import { useProviderReport } from '../../hooks/useProviderReport';
import { useDashboardStore } from '../../stores/dashboardStore';
import { Card } from '../ui/Card';

interface ProviderReportButtonProps {
  compact?: boolean;
}

export function ProviderReportButton({ compact = false }: ProviderReportButtonProps) {
  const { generateReport, isGenerating, error } = useProviderReport();
  const dateRange = useDashboardStore((s) => s.dateRange);
  const [includeSafety, setIncludeSafety] = useState(false);

  if (compact) {
    return (
      <div>
        {error && <p className="mb-2 text-sm text-danger">{error}</p>}
        <Button
          variant="primary"
          onClick={() => void generateReport(dateRange, false)}
          disabled={isGenerating}
        >
          <FileText className="mr-2 h-4 w-4" />
          {isGenerating ? 'Generating…' : 'Generate Provider Report'}
        </Button>
      </div>
    );
  }

  return (
    <Card variant="outlined" padding="lg" className="min-w-0">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-lg text-sage-800">Provider Report</h3>
          <p className="mt-1 text-sm text-sage-500">
            Download a PDF summary of your symptoms, medications, and labs for your next
            appointment.
          </p>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>

        <Button
          variant="primary"
          onClick={() => void generateReport(dateRange, includeSafety)}
          disabled={isGenerating}
          className="mx-auto"
        >
          <FileText className="mr-2 h-4 w-4" />
          {isGenerating ? 'Generating…' : 'Generate Provider Report'}
        </Button>

        <label className="flex min-w-0 items-start gap-2 text-sm text-sage-600">
          <input
            type="checkbox"
            checked={includeSafety}
            onChange={(e) => setIncludeSafety(e.target.checked)}
            className="mt-0.5 shrink-0 rounded border-sand-300 text-sage-500 focus:ring-sage-500"
          />
          <span className="min-w-0">
            <span className="font-medium text-sage-700">
              Include emotional-wellbeing safety notes
            </span>
            <span className="mt-0.5 block text-xs text-sage-500">
              Off by default. These are the check-in patterns TrackHer flags for your own
              awareness — share them only if you want your provider to see them.
            </span>
          </span>
        </label>
      </div>
    </Card>
  );
}
