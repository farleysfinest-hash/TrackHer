// PULSE CEILING: three fixed channels + flare row. Never add fixed questions to the pulse — weekly dimensions belong in the MRS.

import { useCheckinStore } from '../../stores/checkinStore';
import { Button } from '../ui/Button';
import { FlareTapRow } from './FlareTapRow';

interface DailyChannelsProps {
  onNext: () => void;
}

interface ChannelRowProps {
  title: string;
  lowLabel: string;
  highLabel: string;
  value: number | null;
  isComplete: boolean;
  onSelect: (score: number) => void;
  onSkip: () => void;
  ariaPrefix: string;
}

function ChannelRow({
  title,
  lowLabel,
  highLabel,
  value,
  isComplete,
  onSelect,
  onSkip,
  ariaPrefix,
}: ChannelRowProps) {
  return (
    <div className="space-y-3 border-b border-sand-100 pb-6 last:border-b-0 last:pb-0">
      <h3 className="font-display text-lg text-sage-800">{title}</h3>
      <div className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: 5 }, (_, i) => i + 1).map((score) => {
          const isSelected = value === score;
          return (
            <button
              key={score}
              type="button"
              onClick={() => onSelect(score)}
              className={[
                'flex h-11 w-11 items-center justify-center rounded-full text-sm font-medium transition-all duration-150',
                isSelected
                  ? 'scale-110 bg-sage-500 text-white shadow-md'
                  : 'bg-sand-100 text-sage-600 hover:bg-sage-100 hover:text-sage-800',
              ].join(' ')}
              aria-label={`${ariaPrefix} ${score}`}
              aria-pressed={isSelected}
            >
              {score}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between px-2 text-xs text-sage-400">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
      {!isComplete && (
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-sage-500 underline hover:text-sage-700"
        >
          Skip
        </button>
      )}
      {isComplete && value === null && (
        <p className="text-sm text-sage-400">Skipped</p>
      )}
    </div>
  );
}

export function DailyChannels({ onNext }: DailyChannelsProps) {
  const energyLevel = useCheckinStore((s) => s.energyLevel);
  const moodLevel = useCheckinStore((s) => s.moodLevel);
  const sleepQuality = useCheckinStore((s) => s.sleepQuality);
  const energyComplete = useCheckinStore((s) => s.energyComplete);
  const moodComplete = useCheckinStore((s) => s.moodComplete);
  const sleepComplete = useCheckinStore((s) => s.sleepComplete);
  const setEnergyLevel = useCheckinStore((s) => s.setEnergyLevel);
  const skipEnergy = useCheckinStore((s) => s.skipEnergy);
  const setMoodLevel = useCheckinStore((s) => s.setMoodLevel);
  const skipMood = useCheckinStore((s) => s.skipMood);
  const setSleepQuality = useCheckinStore((s) => s.setSleepQuality);
  const skipSleepQuality = useCheckinStore((s) => s.skipSleepQuality);
  const allChannelsComplete = useCheckinStore((s) => s.allChannelsComplete);

  const canContinue = allChannelsComplete();

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="font-display text-2xl text-sage-800">Your daily pulse</h2>
        <p className="mt-2 text-sm text-sage-500">
          Three quick taps — skip anything you don&apos;t want to answer.
        </p>
      </div>

      <div className="space-y-6">
        <ChannelRow
          title="How's your energy?"
          lowLabel="Drained"
          highLabel="Energized"
          value={energyLevel}
          isComplete={energyComplete}
          onSelect={setEnergyLevel}
          onSkip={skipEnergy}
          ariaPrefix="Energy"
        />
        <ChannelRow
          title="How's your mood?"
          lowLabel="Rough"
          highLabel="Great"
          value={moodLevel}
          isComplete={moodComplete}
          onSelect={setMoodLevel}
          onSkip={skipMood}
          ariaPrefix="Mood"
        />
        <ChannelRow
          title="How did you sleep?"
          lowLabel="Rough"
          highLabel="Great"
          value={sleepQuality}
          isComplete={sleepComplete}
          onSelect={setSleepQuality}
          onSkip={skipSleepQuality}
          ariaPrefix="Sleep quality"
        />
      </div>

      <FlareTapRow />

      {canContinue && (
        <div className="text-center">
          <Button onClick={onNext} className="mx-auto">
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}
