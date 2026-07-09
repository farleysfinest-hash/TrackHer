import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { SymptomChip } from '../onboarding/SymptomChip';
import { SYMPTOM_CATALOG } from '../../data/symptoms';
import {
  SYMPTOM_BODY_SYSTEM_LABELS,
  type SymptomBodySystem,
} from '../../types/symptoms';
import { isMRSCanonicalKey } from '../../utils/checkinHelpers';
import { useSymptomSelections } from '../../hooks/useSymptomSelections';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/Button';
import type { StrawStageCode } from '../../lib/strawStaging';

interface SymptomManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  onSave: (selectedIds: string[]) => void;
}

const BODY_SYSTEM_ORDER: SymptomBodySystem[] = [
  'vasomotor',
  'mood',
  'cognitive',
  'sleep',
  'musculoskeletal',
  'energy',
  'cardiovascular',
  'genitourinary',
  'digestive',
  'skin_hair_nails',
  'neurological',
  'other',
];

function groupExtendedSymptoms(stage: StrawStageCode | null) {
  const extended = SYMPTOM_CATALOG.filter((s) => !s.isMRSCore && !isMRSCanonicalKey(s.key));
  const groups = new Map<SymptomBodySystem, typeof extended>();

  for (const system of BODY_SYSTEM_ORDER) {
    groups.set(system, []);
  }

  for (const symptom of extended) {
    groups.get(symptom.bodySystem)!.push(symptom);
  }

  return { groups, stage };
}

export function SymptomManageModal({
  isOpen,
  onClose,
  selectedIds,
  onSave,
}: SymptomManageModalProps) {
  const [localSelected, setLocalSelected] = useState<string[]>(selectedIds);
  const [isSaving, setIsSaving] = useState(false);
  const stage = useAuthStore((s) => s.profile?.straw_stage ?? null);
  const { saveSelections, watchSymptomIds } = useSymptomSelections();
  const { groups } = groupExtendedSymptoms(stage);

  useEffect(() => {
    if (isOpen) setLocalSelected(selectedIds);
  }, [isOpen, selectedIds]);

  const toggle = (id: string) => {
    setLocalSelected((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    const rows = localSelected.map((symptom_id) => ({
      symptom_id,
      is_watch_symptom: watchSymptomIds.includes(symptom_id),
    }));
    const ok = await saveSelections(rows, watchSymptomIds);
    setIsSaving(false);
    if (ok) {
      onSave(localSelected);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage tracked symptoms" size="lg">
      <p className="mb-4 text-sm text-sage-500">
        Select every symptom you experience — even ones that only show up sometimes. Occasional
        symptoms are often the most revealing; the more you track, the more connections the engine
        can find for you.
      </p>

      <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
        {BODY_SYSTEM_ORDER.map((system) => {
          const symptoms = groups.get(system)!;
          if (symptoms.length === 0) return null;
          return (
            <div key={system}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sage-500">
                {SYMPTOM_BODY_SYSTEM_LABELS[system]}
              </h3>
              <div className="flex flex-wrap gap-2">
                {symptoms.map((s) => (
                  <SymptomChip
                    key={s.key}
                    label={s.label}
                    checked={localSelected.includes(s.key)}
                    onToggle={() => toggle(s.key)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="secondary" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          isLoading={isSaving}
          loadingText="Saving..."
          onClick={handleSave}
          className="flex-1"
          disabled={localSelected.length === 0}
        >
          Save
        </Button>
      </div>
    </Modal>
  );
}
