import { useCheckinStore } from '../../stores/checkinStore';
import { Button } from '../ui/Button';

interface CheckinNotesProps {
  onNext: () => void;
  onBack: () => void;
}

const MAX_NOTES = 2000;

export function CheckinNotes({ onNext, onBack }: CheckinNotesProps) {
  const notes = useCheckinStore((s) => s.notes);
  const setNotes = useCheckinStore((s) => s.setNotes);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-sage-800">Anything else you want to note?</h2>
        <p className="mt-2 text-sage-500">
          This is optional. Your notes are private and can be helpful when looking back at your
          symptom patterns.
        </p>
      </div>

      <div>
        <textarea
          className="w-full rounded-lg border border-sand-200 bg-white px-4 py-3 text-base text-sage-800 focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-500/20"
          rows={5}
          maxLength={MAX_NOTES}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder='e.g., "Started new meditation practice" or "Stressful week at work"'
        />
        {notes.length > 1500 && (
          <p className="mt-1 text-right text-xs text-sage-400">
            {notes.length}/{MAX_NOTES}
          </p>
        )}
      </div>

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
