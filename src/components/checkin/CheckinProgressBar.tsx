import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

export interface CheckinProgressItem {
  label: string;
  done: boolean;
}

interface CheckinProgressBarProps {
  items: CheckinProgressItem[];
  /** Compact mode for dashboard — shows a clickable card linking to /checkin. */
  compact?: boolean;
}

function ItemPip({ item }: { item: CheckinProgressItem }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <div
        className={[
          'h-1.5 w-full rounded-full transition-colors',
          item.done ? 'bg-success' : 'bg-sage-200',
        ].join(' ')}
      />
      <span
        className={[
          'text-[10px] leading-none',
          item.done ? 'text-success' : 'text-sage-400',
        ].join(' ')}
      >
        {item.label}
      </span>
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
          'flex w-full flex-col gap-2 rounded-xl border px-4 py-3 text-left transition-colors',
          allDone
            ? 'border-success/40 bg-success/10 hover:border-success/60'
            : 'border-sage-300 bg-sage-50 hover:border-sage-400',
        ].join(' ')}
      >
        <div className="flex w-full items-center justify-between">
          <span
            className={[
              'text-xs font-medium uppercase tracking-wide',
              allDone ? 'text-success' : 'text-sage-500',
            ].join(' ')}
          >
            {allDone ? 'Today’s check-ins complete' : 'Today’s check-ins'}
          </span>
          {allDone ? (
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
          ) : (
            <span className="text-xs text-sage-400">{done}/{total}</span>
          )}
        </div>
        <div className="flex w-full gap-2">
          {items.map((item) => (
            <ItemPip key={item.label} item={item} />
          ))}
        </div>
      </button>
    );
  }

  return (
    <div
      className={[
        'flex flex-col gap-2 rounded-xl border px-4 py-3',
        allDone
          ? 'border-success/40 bg-success/10'
          : 'border-sand-200 bg-sand-100',
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <span
          className={[
            'text-xs font-medium uppercase tracking-wide',
            allDone ? 'text-success' : 'text-sage-500',
          ].join(' ')}
        >
          {allDone ? 'All done today' : 'Today’s check-ins'}
        </span>
        {allDone ? (
          <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
        ) : (
          <span className="text-xs text-sage-400">{done}/{total}</span>
        )}
      </div>
      <div className="flex gap-2">
        {items.map((item) => (
          <ItemPip key={item.label} item={item} />
        ))}
      </div>
    </div>
  );
}
