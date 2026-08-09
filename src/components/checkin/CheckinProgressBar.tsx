import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';

export interface CheckinProgressItem {
  label: string;
  done: boolean;
}

interface CheckinProgressBarProps {
  items: CheckinProgressItem[];
  /** Compact mode for dashboard — shows a clickable card linking to /checkin. */
  compact?: boolean;
}

function StepDot({ item }: { item: CheckinProgressItem }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={[
          'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors',
          item.done
            ? 'border-moss-500 bg-moss-500'
            : 'border-sand-300 bg-transparent',
        ].join(' ')}
      >
        {item.done && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} aria-hidden />}
      </div>
      <span
        className={[
          'text-[10px] leading-none',
          item.done ? 'text-moss-600' : 'text-sage-400',
        ].join(' ')}
      >
        {item.label}
      </span>
    </div>
  );
}

function Stepper({ items }: { items: CheckinProgressItem[] }) {
  return (
    <div className="flex items-start justify-center gap-0">
      {items.map((item, i) => (
        <div key={item.label} className="flex items-start">
          <StepDot item={item} />
          {i < items.length - 1 && (
            <div
              className={[
                'mt-[11px] h-0.5 w-8 flex-shrink-0 transition-colors sm:w-12',
                item.done && items[i + 1].done ? 'bg-moss-500' : 'bg-sand-300',
              ].join(' ')}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function CheckinProgressBar({ items, compact = false }: CheckinProgressBarProps) {
  const navigate = useNavigate();
  const done = items.filter((i) => i.done).length;
  const total = items.length;
  const allDone = done === total;

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => navigate('/checkin')}
        className={[
          'flex w-full flex-col items-center gap-2 rounded-xl border px-4 py-3 transition-colors',
          allDone
            ? 'border-moss-300/60 bg-moss-100/60 hover:border-moss-300'
            : 'border-sage-300 bg-sage-50 hover:border-sage-400',
        ].join(' ')}
      >
        <div className="flex w-full items-center justify-between">
          <span
            className={[
              'text-xs font-medium uppercase tracking-wide',
              allDone ? 'text-moss-600' : 'text-sage-500',
            ].join(' ')}
          >
            {allDone ? 'All done today' : 'Today’s check-ins'}
          </span>
          <span className={['text-xs', allDone ? 'text-moss-600' : 'text-sage-400'].join(' ')}>
            {done}/{total}
          </span>
        </div>
        <Stepper items={items} />
      </button>
    );
  }

  return (
    <div
      className={[
        'flex flex-col items-center gap-2 rounded-xl border px-4 py-3',
        allDone
          ? 'border-moss-300/60 bg-moss-100/60'
          : 'border-sand-200 bg-sand-100',
      ].join(' ')}
    >
      <div className="flex w-full items-center justify-between">
        <span
          className={[
            'text-xs font-medium uppercase tracking-wide',
            allDone ? 'text-moss-600' : 'text-sage-500',
          ].join(' ')}
        >
          {allDone ? 'All done today' : 'Today’s check-ins'}
        </span>
        <span className={['text-xs', allDone ? 'text-moss-600' : 'text-sage-400'].join(' ')}>
          {done}/{total}
        </span>
      </div>
      <Stepper items={items} />
    </div>
  );
}
