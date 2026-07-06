import { useCheckinStore } from '../../stores/checkinStore';
import { getWellbeingLabel } from '../../utils/checkinHelpers';
import { Button } from '../ui/Button';

interface WellbeingScoreProps {
  onNext: () => void;
}

export function WellbeingScore({ onNext }: WellbeingScoreProps) {
  const wellbeingScore = useCheckinStore((s) => s.wellbeingScore);
  const setWellbeingScore = useCheckinStore((s) => s.setWellbeingScore);

  const handleSelect = (score: number) => {
    setWellbeingScore(score);
    setTimeout(onNext, 300);
  };

  return (
    <div className="space-y-8 text-center">
      <div>
        <h2 className="font-display text-2xl text-sage-800">
          How are you feeling overall today?
        </h2>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
          const isSelected = wellbeingScore === score;
          return (
            <button
              key={score}
              type="button"
              onClick={() => handleSelect(score)}
              className={[
                'flex h-11 w-11 items-center justify-center rounded-full text-sm font-medium transition-all duration-150',
                isSelected
                  ? 'scale-110 bg-sage-500 text-white shadow-md'
                  : 'bg-sand-100 text-sage-600 hover:bg-sage-100 hover:text-sage-800',
              ].join(' ')}
              aria-label={`Wellbeing score ${score}`}
              aria-pressed={isSelected}
            >
              {score}
            </button>
          );
        })}
      </div>

      {wellbeingScore !== null && (
        <p className="text-sage-600">{getWellbeingLabel(wellbeingScore)}</p>
      )}

      {wellbeingScore !== null && (
        <Button onClick={onNext} className="mx-auto">
          Continue
        </Button>
      )}
    </div>
  );
}
