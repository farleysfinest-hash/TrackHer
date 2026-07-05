import { FileText } from 'lucide-react';
import { Button } from '../ui/Button';
import { useProviderReport } from '../../hooks/useProviderReport';
import { useDashboardStore } from '../../stores/dashboardStore';
import { Card } from '../ui/Card';

export function ProviderReportButton() {
  const { generateReport, isGenerating, error } = useProviderReport();
  const dateRange = useDashboardStore((s) => s.dateRange);

  return (
    <Card variant="outlined" padding="lg">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-lg text-sage-800">Provider Report</h3>
          <p className="mt-1 text-sm text-sage-500">
            Download a PDF summary of your symptoms, medications, and labs for your next appointment.
          </p>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>
        <Button
          variant="primary"
          onClick={() => void generateReport(dateRange)}
          disabled={isGenerating}
          className="shrink-0"
        >
          <FileText className="mr-2 h-4 w-4" />
          {isGenerating ? 'Generating…' : 'Generate Provider Report'}
        </Button>
      </div>
    </Card>
  );
}
