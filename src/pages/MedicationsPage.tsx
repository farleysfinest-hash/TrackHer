import { useEffect, useState } from 'react';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useMedications } from '../hooks/useMedications';
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
  const [showWizard, setShowWizard] = useState(false);
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [discontinueMed, setDiscontinueMed] = useState<Medication | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  useEffect(() => {
    void fetchMedications();
  }, [fetchMedications]);

  const activeCount = medications.filter((m) => m.is_active).length;

  const handleRefresh = () => {
    void fetchMedications();
  };

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
          className="flex w-full items-center justify-between text-left"
        >
          <h2 className="font-display text-2xl text-sage-800">Medication History</h2>
          {historyExpanded ? (
            <ChevronUp className="h-5 w-5 text-sage-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-sage-400" />
          )}
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
