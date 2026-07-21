import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useMedications } from '../hooks/useMedications';
import { useMedicationChanges } from '../hooks/useMedicationChanges';
import { ActiveMedicationsList } from '../components/medications/ActiveMedicationsList';
import { MedicationEntryWizard } from '../components/medications/MedicationEntryWizard';
import { MedicationDetailModal } from '../components/medications/MedicationDetailModal';
import { DiscontinueModal } from '../components/medications/DiscontinueModal';
import { MedicationHistory } from '../components/medications/MedicationHistory';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Pill } from 'lucide-react';
import type { Medication } from '../types/database';

export function MedicationsPage() {
  const { medications, isLoading, fetchMedications } = useMedications();
  const { changes, fetchChanges } = useMedicationChanges();
  const [showWizard, setShowWizard] = useState(false);
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [discontinueMed, setDiscontinueMed] = useState<Medication | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  useEffect(() => {
    void fetchMedications();
    void fetchChanges();
  }, [fetchMedications, fetchChanges]);

  const activeCount = medications.filter((m) => m.is_active).length;

  const historySummary = useMemo(() => {
    const medCount = medications.length;
    const changeCount = changes.length;
    const medLabel = `${medCount} medication${medCount === 1 ? '' : 's'}`;
    const changeLabel = `${changeCount} change${changeCount === 1 ? '' : 's'}`;
    return `${medLabel} · ${changeLabel}`;
  }, [medications.length, changes.length]);

  const handleRefresh = useCallback(() => {
    // Called after mutations (add/discontinue/dose change) that also write
    // medication_changes rows, so force past the cache to pick those up.
    void fetchMedications({ force: true });
    void fetchChanges({ force: true });
  }, [fetchMedications, fetchChanges]);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-sage-800">Medications</h1>
          <p className="mt-1 text-sage-500">Track your HRT/BHRT regimen and dose changes over time.</p>
        </div>
        {activeCount > 0 && (
          <Button onClick={() => setShowWizard(true)}>
            <Plus className="h-5 w-5" />
            Add Medication
          </Button>
        )}
      </div>

      <section>
        <h2 className="font-display text-2xl text-sage-800">Your Current Medications</h2>

        {!isLoading && activeCount === 0 ? (
          <EmptyState
            icon={Pill}
            title="No medications yet"
            description="You haven't added any medications yet. Add your current HRT/BHRT regimen to start tracking."
            actionLabel="Add Your First Medication"
            onAction={() => setShowWizard(true)}
          />
        ) : (
          <div className="mt-4">
            <ActiveMedicationsList
              medications={medications}
              isLoading={isLoading}
              onEdit={setSelectedMed}
              onDiscontinue={setDiscontinueMed}
              onRefresh={handleRefresh}
            />
          </div>
        )}
      </section>

      <section>
        <button
          type="button"
          onClick={() => setHistoryExpanded(!historyExpanded)}
          aria-expanded={historyExpanded}
          className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-3 text-left transition-colors hover:bg-sage-50"
        >
          <div className="min-w-0 pr-4">
            <h2 className="font-display text-2xl text-sage-800">Medication History</h2>
            {!historyExpanded && (
              <p className="mt-1 text-sm text-sage-500">{historySummary}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-sm text-sage-500">
            <span>{historyExpanded ? 'Hide history' : 'Show history'}</span>
            {historyExpanded ? (
              <ChevronUp className="h-5 w-5" aria-hidden />
            ) : (
              <ChevronDown className="h-5 w-5" aria-hidden />
            )}
          </div>
        </button>
        <div className="mt-4">
          <MedicationHistory isExpanded={historyExpanded} />
        </div>
      </section>

      <MedicationEntryWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={() => {
          setShowWizard(false);
          handleRefresh();
        }}
      />

      <MedicationDetailModal
        medication={selectedMed}
        isOpen={!!selectedMed}
        onClose={() => setSelectedMed(null)}
        onRefresh={handleRefresh}
      />

      <DiscontinueModal
        medication={discontinueMed}
        isOpen={!!discontinueMed}
        onClose={() => setDiscontinueMed(null)}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
