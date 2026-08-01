import { useEffect, useState } from 'react';
import { Camera, TestTube2 } from 'lucide-react';
import { useLabResults } from '../hooks/useLabResults';
import { useLabEntryStore } from '../stores/labEntryStore';
import { LabEntryForm } from '../components/labs/LabEntryForm';
import { LabHistory } from '../components/labs/LabHistory';
import { LabDetailModal } from '../components/labs/LabDetailModal';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { LabResult } from '../types/database';
import { LunaContextCard } from '../components/luna/LunaContextCard';
import { LabReportImportDialog } from '../components/labs/LabReportImportDialog';
import { useMedications } from '../hooks/useMedications';
import { useLuna } from '../components/luna/LunaProvider';
import { useLocation, useNavigate } from 'react-router-dom';

export function LabsPage() {
  const { labResults, isLoading, fetchLabResults } = useLabResults();
  const { reset, loadExistingLab, loadImportDraft } = useLabEntryStore();
  const { medications, fetchMedications } = useMedications();
  const { openLuna } = useLuna();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeEntry, setActiveEntry] = useState(false);
  const [detailLab, setDetailLab] = useState<LabResult | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    void fetchLabResults();
    void fetchMedications();
  }, [fetchLabResults, fetchMedications]);

  useEffect(() => {
    const action = new URLSearchParams(location.search).get('action');
    if (action === 'import') setImportOpen(true);
    if (action === 'add') startEntry();
    if (action === 'import' || action === 'add') navigate('/labs', { replace: true });
    // Deep links are consumed once; startEntry intentionally uses current store actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

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

  const handleSuccess = (confirmedMedicationMentions: string[] = []) => {
    setActiveEntry(false);
    void fetchLabResults();
    if (confirmedMedicationMentions.length > 0) {
      const names = confirmedMedicationMentions.join(', ');
      void openLuna({
        kind: 'medication',
        title: 'Medication mentioned on a lab report',
        context: {
          sourceType: 'lab_import',
          label: names,
          medicationMentions: confirmedMedicationMentions,
        },
        seedMessage: `My lab report mentions ${names}, and I confirmed that I take ${confirmedMedicationMentions.length === 1 ? 'it' : 'them'}. Help me prepare ${confirmedMedicationMentions.length === 1 ? 'this medication' : 'these medications'} for review before anything is added.`,
      });
    }
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
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            <Camera className="h-4 w-4" aria-hidden />
            Import report photo
          </Button>
          {hasLabs && <Button onClick={startEntry}>Add Lab Results</Button>}
        </div>
      </div>

      <LunaContextCard
        title="Luna on lab results"
        description="Ask about a result or how laboratory changes line up with symptoms and recorded treatment timing."
        actionLabel="Ask Luna about your labs"
        request={{
          kind: 'lab',
          title: 'Lab questions',
          context: {
            sourceType: 'labs',
            label: 'Your lab history',
          },
        }}
      />

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

      <LabReportImportDialog
        isOpen={importOpen}
        medicationNames={medications.map((medication) => medication.medication_name)}
        onClose={() => setImportOpen(false)}
        onImported={(draft, unknownMedicationMentions) => {
          reset();
          loadImportDraft(draft, unknownMedicationMentions);
          setImportOpen(false);
          setActiveEntry(true);
        }}
      />
    </div>
  );
}
