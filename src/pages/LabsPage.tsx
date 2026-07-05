import { useEffect, useState } from 'react';
import { TestTube2 } from 'lucide-react';
import { useLabResults } from '../hooks/useLabResults';
import { useLabEntryStore } from '../stores/labEntryStore';
import { LabEntryForm } from '../components/labs/LabEntryForm';
import { LabHistory } from '../components/labs/LabHistory';
import { LabDetailModal } from '../components/labs/LabDetailModal';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { LabResult } from '../types/database';

export function LabsPage() {
  const { labResults, isLoading, fetchLabResults } = useLabResults();
  const { reset, loadExistingLab } = useLabEntryStore();

  const [activeEntry, setActiveEntry] = useState(false);
  const [detailLab, setDetailLab] = useState<LabResult | null>(null);

  useEffect(() => {
    void fetchLabResults();
  }, [fetchLabResults]);

  const startEntry = () => {
    reset();
    setActiveEntry(true);
  };

  const handleEdit = (lab: LabResult) => {
    setDetailLab(null);
    reset();
    loadExistingLab(lab);
    setActiveEntry(true);
  };

  const handleSuccess = () => {
    setActiveEntry(false);
    void fetchLabResults();
  };

  if (activeEntry) {
    return <LabEntryForm onClose={() => setActiveEntry(false)} onSuccess={handleSuccess} />;
  }

  const hasLabs = !isLoading && labResults.length > 0;

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-sage-800">Lab Results</h1>
          <p className="mt-1 text-sage-500">
            Track your blood work to see how your hormone levels relate to how you&apos;re feeling.
          </p>
        </div>
        {hasLabs && <Button onClick={startEntry}>Add Lab Results</Button>}
      </div>

      {!isLoading && !hasLabs ? (
        <EmptyState
          icon={TestTube2}
          title="No lab results yet"
          description="After your next blood draw, add your results here to start tracking trends."
          actionLabel="Add Your First Lab Results"
          onAction={startEntry}
        />
      ) : (
        !isLoading &&
        !hasLabs && (
          <Card variant="elevated" padding="lg">
            <Button onClick={startEntry}>Add Lab Results</Button>
          </Card>
        )
      )}

      {hasLabs && <LabHistory onViewDetails={setDetailLab} />}

      <LabDetailModal
        lab={detailLab}
        isOpen={!!detailLab}
        onClose={() => setDetailLab(null)}
        onEdit={handleEdit}
        onDeleted={() => void fetchLabResults()}
      />
    </div>
  );
}
