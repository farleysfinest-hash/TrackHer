import { useCheckinStore } from '../../stores/checkinStore';
import { getWellbeingLabel } from '../../utils/checkinHelpers';
import { Button } from '../ui/Button';

interface WellbeingScoreProps {
  onNext: () => void;
}

const SLEEP_LABELS: Record<number, string> = {
  1: 'Rough',
  5: 'Great',
};

export function WellbeingScore({ onNext }: WellbeingScoreProps) {
  const wellbeingScore = useCheckinStore((s) => s.wellbeingScore);
  const sleepQuality = useCheckinStore((s) => s.sleepQuality);
  const setWellbeingScore = useCheckinStore((s) => s.setWellbeingScore);
  const setSleepQuality = useCheckinStore((s) => s.setSleepQuality);
  const skipSleepQuality = useCheckinStore((s) => s.skipSleepQuality);

  const handleSelect = (score: number) => {
    setWellbeingScore(score);
  };

  const showSleep = wellbeingScore !== null;

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

      {showSleep && (
        <div className="space-y-4 border-t border-sand-100 pt-6">
          <h3 className="font-display text-lg text-sage-800">How did you sleep?</h3>
          <div className="flex flex-wrap justify-center gap-2">
            {Array.from({ length: 5 }, (_, i) => i + 1).map((score) => {
              const isSelected = sleepQuality === score;
              return (
                <button
                  key={score}
                  type="button"
                  onClick={() => setSleepQuality(score)}
                  className={[
                    'flex h-11 w-11 items-center justify-center rounded-full text-sm font-medium transition-all duration-150',
                    isSelected
                      ? 'scale-110 bg-sage-500 text-white shadow-md'
                      : 'bg-sand-100 text-sage-600 hover:bg-sage-100 hover:text-sage-800',
                  ].join(' ')}
                  aria-label={`Sleep quality ${score}`}
                  aria-pressed={isSelected}
                >
                  {score}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between px-4 text-xs text-sage-400">
            <span>{SLEEP_LABELS[1]}</span>
            <span>{SLEEP_LABELS[5]}</span>
          </div>
          <button
            type="button"
            onClick={skipSleepQuality}
            className="text-sm text-sage-500 underline hover:text-sage-700"
          >
            Skip
          </button>
        </div>
      )}

      {wellbeingScore !== null && (
        <Button onClick={onNext} className="mx-auto">
          Continue
        </Button>
      )}
    </div>
  );
}
