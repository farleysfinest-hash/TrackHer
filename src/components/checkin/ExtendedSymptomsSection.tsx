import { useEffect, useMemo, useState } from 'react';
import { useCheckinStore } from '../../stores/checkinStore';
import { useSymptomSelections } from '../../hooks/useSymptomSelections';
import { getSymptomByKey } from '../../data/symptoms';
import type { MRSScore } from '../../types/database';
import { WatchSymptomTapRow } from './WatchSymptomTapRow';
import { AddSymptomPicker, KeepWatchingPrompt } from './AddSymptomPicker';
import { Button } from '../ui/Button';

interface ExtendedSymptomsSectionProps {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function ExtendedSymptomsSection({ onNext, onBack, onSkip }: ExtendedSymptomsSectionProps) {
  const extendedSymptoms = useCheckinStore((s) => s.extendedSymptoms);
  const pendingKeepWatch = useCheckinStore((s) => s.pendingKeepWatch);
  const setExtendedScore = useCheckinStore((s) => s.setExtendedScore);
  const addAdHocSymptom = useCheckinStore((s) => s.addAdHocSymptom);
  const dismissKeepWatch = useCheckinStore((s) => s.dismissKeepWatch);
  const initWatchSymptomsForCheckin = useCheckinStore((s) => s.initWatchSymptomsForCheckin);
  const { watchSymptomIds, trackedSymptomIds, isLoading, saveSelections } = useSymptomSelections();
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && watchSymptomIds.length > 0 && extendedSymptoms.length === 0) {
      initWatchSymptomsForCheckin(watchSymptomIds);
    }
  }, [isLoading, watchSymptomIds, extendedSymptoms.length, initWatchSymptomsForCheckin]);

  const gridSymptomIds = useMemo(() => {
    const watchSet = new Set(watchSymptomIds);
    const adHoc = extendedSymptoms
      .map((s) => s.symptom_key)
      .filter((key) => !watchSet.has(key));
    return [...watchSymptomIds, ...adHoc];
  }, [watchSymptomIds, extendedSymptoms]);

  const handleScoreChange = (symptomKey: string, score: MRSScore) => {
    setExtendedScore(symptomKey, score);
  };

  const handleAddSymptom = (symptomId: string) => {
    addAdHocSymptom(symptomId);
  };

  const handleKeepWatch = async (symptomId: string) => {
    const newWatch = [...watchSymptomIds, symptomId];
    const trackedSet = new Set([...trackedSymptomIds, symptomId]);
    const rows = [...trackedSet].map((id) => ({
      symptom_id: id,
      is_watch_symptom: newWatch.includes(id),
    }));
    const ok = await saveSelections(rows, newWatch);
    if (ok) dismissKeepWatch(symptomId);
  };

  const keepWatchPrompts = pendingKeepWatch.filter((id) => !watchSymptomIds.includes(id));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="font-display text-2xl text-sage-800">Anything else today?</h2>
          <p className="mt-2 text-sage-500">
            Tap severity for your watch symptoms — quick ratings on top of your MRS score.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onSkip}>
          Skip
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-sage-400">Loading your watch symptoms...</p>
      ) : (
        <>
          {gridSymptomIds.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {gridSymptomIds.map((key) => {
                const def = getSymptomByKey(key);
                if (!def) return null;
                const entry = extendedSymptoms.find((s) => s.symptom_key === key);
                return (
                  <WatchSymptomTapRow
                    key={key}
                    symptomKey={key}
                    label={def.label}
                    value={entry?.severity ?? null}
                    onChange={handleScoreChange}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-sage-500">
              No watch symptoms yet — add one below or skip this step.
            </p>
          )}

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full rounded-xl border-2 border-dashed border-sage-300 bg-sage-50/50 px-4 py-4 text-center text-sm font-medium text-sage-700 transition-colors hover:border-sage-400 hover:bg-sage-50"
          >
            Feeling something else today? + Add a symptom
          </button>

          {keepWatchPrompts.map((symptomId) => (
            <KeepWatchingPrompt
              key={symptomId}
              symptomId={symptomId}
              onKeep={() => void handleKeepWatch(symptomId)}
              onDismiss={() => dismissKeepWatch(symptomId)}
            />
          ))}
        </>
      )}

      <AddSymptomPicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        excludeIds={gridSymptomIds}
        onSelect={handleAddSymptom}
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
