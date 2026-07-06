import { useEffect, useMemo, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { useCheckinStore } from '../../stores/checkinStore';
import { useSymptomSelections } from '../../hooks/useSymptomSelections';
import { getSymptomByKey } from '../../data/symptoms';
import type { MRSScore } from '../../types/database';
import { SeveritySlider } from './SeveritySlider';
import { SymptomManageModal } from './SymptomManageModal';
import { Button } from '../ui/Button';

interface ExtendedSymptomsSectionProps {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function ExtendedSymptomsSection({ onNext, onBack, onSkip }: ExtendedSymptomsSectionProps) {
  const extendedSymptoms = useCheckinStore((s) => s.extendedSymptoms);
  const setExtendedScore = useCheckinStore((s) => s.setExtendedScore);
  const setTrackedSymptoms = useCheckinStore((s) => s.setTrackedSymptoms);
  const { trackedSymptomIds, isLoading } = useSymptomSelections();
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && trackedSymptomIds.length > 0) {
      const currentKeys = extendedSymptoms.map((s) => s.symptom_key);
      const needsSync =
        trackedSymptomIds.length !== currentKeys.length ||
        trackedSymptomIds.some((k) => !currentKeys.includes(k));
      if (needsSync && extendedSymptoms.length === 0) {
        setTrackedSymptoms(trackedSymptomIds);
      }
    }
  }, [isLoading, trackedSymptomIds, extendedSymptoms, setTrackedSymptoms]);

  const symptomsToShow = useMemo(() => {
    const keys =
      extendedSymptoms.length > 0
        ? extendedSymptoms.map((s) => s.symptom_key)
        : trackedSymptomIds;
    return keys
      .map((key) => {
        const def = getSymptomByKey(key);
        const entry = extendedSymptoms.find((s) => s.symptom_key === key);
        return def ? { def, severity: entry?.severity ?? null } : null;
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);
  }, [extendedSymptoms, trackedSymptomIds]);

  const handleScoreChange = (symptomKey: string, score: MRSScore) => {
    setExtendedScore(symptomKey, score);
  };

  const handleManageSave = (selectedIds: string[]) => {
    setTrackedSymptoms(selectedIds);
    setManageOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-sage-800">Your personal tracker</h2>
          <p className="mt-2 text-sage-500">
            Rate the symptoms you chose to track. These are separate from your MRS score and help
            you spot personal patterns over time.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onSkip}>
          Skip
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setManageOpen(true)}
        className="inline-flex items-center gap-2 text-sm font-medium text-sage-600 hover:text-sage-800"
      >
        <Settings2 className="h-4 w-4" />
        Manage symptoms
      </button>

      {isLoading ? (
        <p className="text-sm text-sage-400">Loading your symptoms...</p>
      ) : symptomsToShow.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sand-300 bg-white p-8 text-center">
          <p className="text-sage-500">No personal symptoms selected yet.</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => setManageOpen(true)}>
            Add symptoms to track
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-sand-200 bg-gradient-to-br from-white to-sand-50/80 px-4">
          {symptomsToShow.map(({ def, severity }) => (
            <SeveritySlider
              key={def.key}
              symptomKey={def.key}
              label={def.label}
              description={def.description}
              value={severity}
              onChange={handleScoreChange}
            />
          ))}
        </div>
      )}

      <SymptomManageModal
        isOpen={manageOpen}
        onClose={() => setManageOpen(false)}
        selectedIds={
          extendedSymptoms.length > 0
            ? extendedSymptoms.map((s) => s.symptom_key)
            : trackedSymptomIds
        }
        onSave={handleManageSave}
      />

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={onNext} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  );
}
