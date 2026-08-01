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
  const { openLuna } = useLuna();

  return (
    <button
      type="button"
      onClick={() => void openLuna(request)}
      className="flex w-full items-start gap-3 rounded-xl border border-sand-200 bg-sand-50 px-4 py-3 text-left transition-colors hover:border-sage-300 hover:bg-sage-50/40"
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-600">
        <Moon className="h-4.5 w-4.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-sage-800">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-sage-500">{description}</span>
        <span className="mt-2 block text-sm font-medium text-sage-600">{actionLabel}</span>
      </span>
    </button>
  );
}
