import type { SymptomCheckin } from '../../types/database';
import { hasNewDailyChannels } from '../../utils/checkinHelpers';
import { ChannelDots } from './ChannelDots';

interface DailyChannelsDisplayProps {
  checkin: Pick<
    SymptomCheckin,
    'energy_level' | 'mood_level' | 'sleep_quality' | 'overall_wellbeing' | 'bleeding_flow'
  >;
  /** Horizontal wrap for tight spaces (history rows). */
  compact?: boolean;
}

export function DailyChannelsDisplay({ checkin, compact = false }: DailyChannelsDisplayProps) {
  if (!hasNewDailyChannels(checkin as SymptomCheckin) && checkin.overall_wellbeing !== null) {
    return (
      <span className="text-sm text-sage-600">Wellbeing {checkin.overall_wellbeing}/10</span>
    );
  }

  const channels = [
    { label: 'Energy', value: checkin.energy_level },
    { label: 'Mood', value: checkin.mood_level },
    { label: 'Sleep', value: checkin.sleep_quality },
  ];

  const answered = channels.filter((c) => c.value != null);
  const showBleeding =
    checkin.bleeding_flow !== null &&
    checkin.bleeding_flow !== undefined &&
    checkin.bleeding_flow !== 'none';

  if (answered.length === 0 && !showBleeding) return null;

  return (
    <div className={compact ? 'flex flex-wrap items-center gap-x-4 gap-y-1.5' : 'space-y-2'}>
      {answered.map((channel) => (
        <div key={channel.label} className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-sm text-sage-500">{channel.label}</span>
          <ChannelDots value={channel.value} label={channel.label} />
        </div>
      ))}
      {showBleeding && (
        <div className={compact ? 'flex items-center gap-2' : 'flex items-center gap-2'}>
          <span className="w-12 shrink-0 text-sm text-sage-500">Bleeding</span>
          <span className="text-sm capitalize text-sage-700">{checkin.bleeding_flow}</span>
        </div>
      )}
    </div>
  );
}
