import { Moon } from 'lucide-react';
import type { OpenLunaRequest } from './LunaProvider';
import { useLuna } from './LunaProvider';

interface LunaContextCardProps {
  title: string;
  description: string;
  actionLabel: string;
  request: OpenLunaRequest;
}

export function LunaContextCard({
  title,
  description,
  actionLabel,
  request,
}: LunaContextCardProps) {
  const { openLuna, lunaActiveToday } = useLuna();

  return (
    <button
      type="button"
      onClick={() => void openLuna(request)}
      className={[
        'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
        lunaActiveToday
          ? 'border-success/40 bg-success/10 hover:border-success/60'
          : 'border-sage-300 bg-sage-50 hover:border-sage-400',
      ].join(' ')}
    >
      <span
        className={[
          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          lunaActiveToday
            ? 'bg-success/20 text-success'
            : 'bg-sage-100 text-sage-600',
        ].join(' ')}
      >
        <Moon className="h-4.5 w-4.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-sage-800">
          {lunaActiveToday ? 'Talked with Luna today' : title}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-sage-500">
          {lunaActiveToday
            ? 'Tap to continue your conversation.'
            : description}
        </span>
        {!lunaActiveToday && (
          <span className="mt-2 block text-sm font-medium text-sage-600">{actionLabel}</span>
        )}
      </span>
    </button>
  );
}
