import { useMemo } from 'react';
import {
  Flame,
  Brain,
  Moon,
  Heart,
  Zap,
  Activity,
  type LucideIcon,
} from 'lucide-react';
import { useQuickLogStore } from '../../stores/quickLogStore';
import { useSymptomSelections } from '../../hooks/useSymptomSelections';
import { getSymptomByKey, getSymptomChipLabel } from '../../data/symptoms';
import type { SymptomBodySystem } from '../../types/symptoms';
import { Card } from '../ui/Card';
import { QuickLogSheet } from './QuickLogSheet';

const ICON_BY_SYSTEM: Partial<Record<SymptomBodySystem, LucideIcon>> = {
  vasomotor: Flame,
  mood: Heart,
  cognitive: Brain,
  sleep: Moon,
  energy: Zap,
};

function SymptomIcon({ bodySystem }: { bodySystem: SymptomBodySystem }) {
  const Icon = ICON_BY_SYSTEM[bodySystem] ?? Activity;
  return <Icon className="h-4 w-4 shrink-0" aria-hidden />;
}

function chipLabel(id: string): string {
  return getSymptomChipLabel(getSymptomByKey(id)) || id;
}

/** Pair shortest with longest so wrap/grid rows fill instead of short+short then lonely longs. */
function packShortWithLong(ids: string[]): string[] {
  const sorted = [...ids].sort((a, b) => chipLabel(a).length - chipLabel(b).length);
  const packed: string[] = [];
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo <= hi) {
    if (lo === hi) {
      packed.push(sorted[lo]);
      break;
    }
    packed.push(sorted[lo], sorted[hi]);
    lo += 1;
    hi -= 1;
  }
  return packed;
}

export function QuickLogWidget() {
  const openSheet = useQuickLogStore((s) => s.openSheet);
  const { watchSymptomIds, isLoading } = useSymptomSelections();

  const packedWatchIds = useMemo(
    () => packShortWithLong(watchSymptomIds),
    [watchSymptomIds],
  );

  if (isLoading) return null;

  if (watchSymptomIds.length === 0) return null;

  return (
    <Card variant="elevated">
      <div className="flex items-center gap-2">
        <Zap className="h-[18px] w-[18px] shrink-0 text-sage-500" aria-hidden />
        <p className="text-xs font-medium uppercase tracking-wide text-sage-500">Quick log</p>
        <span className="ml-auto text-sm text-sage-400">in the moment · ~5 sec</span>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {packedWatchIds.map((id) => {
          const def = getSymptomByKey(id);
          if (!def) return null;
          return (
            <button
              key={id}
              type="button"
              onClick={() => openSheet(id)}
              className="inline-flex min-w-0 items-center justify-center gap-2 rounded-full border border-sage-200 bg-sage-50 px-3 py-1.5 text-sm font-medium text-sage-700 transition-colors hover:border-sage-400 hover:bg-sage-100 active:scale-[0.98]"
            >
              <SymptomIcon bodySystem={def.bodySystem} />
              <span className="truncate">{getSymptomChipLabel(def)}</span>
            </button>
          );
        })}
      </div>

      <QuickLogSheet />
    </Card>
  );
}
