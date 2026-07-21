import { useMedicationsStore } from '../stores/medicationsStore';

export type {
  MedicationDoseUpdate,
  MedicationRegimenUpdate,
  AddMedicationResult,
  MedicationMutationResult,
} from '../stores/medicationsStore';

/**
 * Medications are shared app-wide (dashboard, meds page, insights, charts).
 * State lives in `useMedicationsStore` so every consumer reads the same
 * cached list instead of each triggering its own fetch on mount/tab-switch.
 */
export function useMedications() {
  const medications = useMedicationsStore((s) => s.medications);
  const isLoading = useMedicationsStore((s) => s.isLoading);
  const error = useMedicationsStore((s) => s.error);
  const fetchMedications = useMedicationsStore((s) => s.fetchMedications);
  const fetchActiveMedications = useMedicationsStore((s) => s.fetchActiveMedications);
  const addMedication = useMedicationsStore((s) => s.addMedication);
  const updateMedication = useMedicationsStore((s) => s.updateMedication);
  const changeDose = useMedicationsStore((s) => s.changeDose);
  const changeFrequency = useMedicationsStore((s) => s.changeFrequency);
  const changeRegimen = useMedicationsStore((s) => s.changeRegimen);
  const discontinueMedication = useMedicationsStore((s) => s.discontinueMedication);
  const reactivateMedication = useMedicationsStore((s) => s.reactivateMedication);
  const deleteMedication = useMedicationsStore((s) => s.deleteMedication);

  return {
    medications,
    isLoading,
    error,
    fetchMedications,
    fetchActiveMedications,
    addMedication,
    updateMedication,
    changeDose,
    changeFrequency,
    changeRegimen,
    discontinueMedication,
    reactivateMedication,
    deleteMedication,
  };
}
