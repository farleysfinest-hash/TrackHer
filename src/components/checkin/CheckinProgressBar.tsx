import { useNavigate } from 'react-router-dom';

export interface CheckinProgressItem {
  label: string;
  done: boolean;
}

interface CheckinProgressBarProps {
  items: CheckinProgressItem[];
  /** Compact mode for dashboard — shows a clickable card linking to /checkin. */
  compact?: boolean;
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
          'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
          allDone
            ? 'border-success/40 bg-success/10 hover:border-success/60'
            : 'border-sage-300 bg-sage-50 hover:border-sage-400',
        ].join(' ')}
      >
        <div className="flex flex-1 items-center gap-3">
          <span
            className={[
              'text-sm font-medium',
              allDone ? 'text-success' : 'text-sage-700',
            ].join(' ')}
          >
            {allDone ? 'All done today' : `${done} of ${total} done`}
          </span>
          <div className="flex flex-1 gap-1.5">
            {items.map((item) => (
              <div
                key={item.label}
                className={[
                  'h-1.5 flex-1 rounded-full transition-colors',
                  item.done ? 'bg-success' : 'bg-sage-200',
                ].join(' ')}
              />
            ))}
          </div>
        </div>
        <span className="text-xs text-sage-500">Check in &rsaquo;</span>
      </button>
    );
  }

  return (
    <div
      className={[
        'flex items-center gap-3 rounded-xl border px-4 py-3',
        allDone
          ? 'border-success/40 bg-success/10'
          : 'border-sand-200 bg-sand-100',
      ].join(' ')}
    >
      <span
        className={[
          'shrink-0 text-sm font-medium',
          allDone ? 'text-success' : 'text-sage-700',
        ].join(' ')}
      >
        {allDone ? 'All done' : `${done} of ${total}`}
      </span>
      <div className="flex flex-1 gap-1.5">
        {items.map((item) => (
          <div
            key={item.label}
            title={item.label}
            className={[
              'h-2 flex-1 rounded-full transition-colors',
              item.done ? 'bg-success' : 'bg-sage-200',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}
