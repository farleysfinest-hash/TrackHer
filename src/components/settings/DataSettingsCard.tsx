import { useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { downloadCsv, downloadJson, exportUserData } from '../../utils/dataExport';

interface DataSettingsCardProps {
  onRequestReset: () => void;
  onRequestDelete: () => void;
}

export function DataSettingsCard({ onRequestReset, onRequestDelete }: DataSettingsCardProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportData = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const data = await exportUserData();
      const dateStr = new Date().toISOString().slice(0, 10);
      await downloadJson(data, `trackher-export-${dateStr}.json`);
    } catch (err) {
      setExportError('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    setExportError(null);
    try {
      const data = await exportUserData();
      const dateStr = new Date().toISOString().slice(0, 10);
      await downloadCsv(data, `trackher-export-${dateStr}.csv`);
    } catch (err) {
      setExportError('Export failed. Please try again.');
    } finally {
      setIsExportingCsv(false);
    }
  };

  return (
    <Card>
      <h2 className="font-display text-xl text-sage-800">Data</h2>
      <div className="mt-4 space-y-4">
        <div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => void handleExportData()}
              isLoading={isExporting}
              loadingText="Exporting..."
              disabled={isExportingCsv}
            >
              Export My Data (JSON)
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handleExportCsv()}
              isLoading={isExportingCsv}
              loadingText="Exporting..."
              disabled={isExporting}
            >
              Export spreadsheet (CSV)
            </Button>
          </div>
          <p className="mt-1 text-xs text-sage-500">
            JSON is the complete archive. CSV is a convenience view of check-ins, medications,
            doses, labs, and logs for Excel — free-text cells are escaped so formulas cannot
            run when the file opens.
          </p>
          {exportError && <p className="mt-1 text-sm text-danger">{exportError}</p>}
        </div>

        <div className="rounded-lg border border-sand-200 bg-sand-50 p-4">
          <h3 className="text-sm font-medium text-sage-700">Reset account</h3>
          <p className="mt-1 text-sm text-sage-500">
            Erase all TrackHer data—including profile answers and preferences—and start over.
            Your login and email stay the same.
          </p>
          <Button
            variant="danger"
            className="mt-3"
            onClick={onRequestReset}
          >
            Reset Account
          </Button>
        </div>

        <Button variant="danger" onClick={onRequestDelete}>
          Delete My Account
        </Button>
      </div>
    </Card>
  );
}
