import type { Medication } from '../../types/database';
import { MedicationCard } from './MedicationCard';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ActiveMedicationsListProps {
  medications: Medication[];
  isLoading: boolean;
  onEdit: (med: Medication) => void;
  onDiscontinue: (med: Medication) => void;
  onRefresh: () => void;
}

export function ActiveMedicationsList({
  medications,
  isLoading,
  onEdit,
  onDiscontinue,
  onRefresh,
}: ActiveMedicationsListProps) {
  const activeMeds = medications.filter((m) => m.is_active);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {activeMeds.map((med) => (
        <MedicationCard
          key={med.id}
          medication={med}
          onEdit={onEdit}
          onDiscontinue={onDiscontinue}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}
