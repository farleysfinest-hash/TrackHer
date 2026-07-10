/** Rose ramp: lightest blush (1) → brand rose (5). No red/green semaphore. */
const CHANNEL_FILL: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'bg-sage-100',
  2: 'bg-sage-200',
  3: 'bg-sage-300',
  4: 'bg-sage-400',
  5: 'bg-sage-500',
};

interface ChannelDotsProps {
  value: number | null | undefined;
  label: string;
}

export function ChannelDots({ value, label }: ChannelDotsProps) {
  if (value == null || value < 1 || value > 5) return null;

  const fillClass = CHANNEL_FILL[value as 1 | 2 | 3 | 4 | 5];

  return (
    <div className="inline-flex items-center gap-1.5" aria-label={`${label} ${value} out of 5`}>
      <div className="flex gap-1" aria-hidden>
        {([1, 2, 3, 4, 5] as const).map((step) => (
          <span
            key={step}
            className={[
              'h-2.5 w-2.5 rounded-full',
              step <= value ? fillClass : 'border border-sand-300 bg-transparent',
            ].join(' ')}
          />
        ))}
      </div>
      <span className="text-sm tabular-nums text-sage-600">{value}</span>
    </div>
  );
}
