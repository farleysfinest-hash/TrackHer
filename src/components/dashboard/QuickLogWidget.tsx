import { useMemo, useState } from 'react';
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
import { SymptomManageModal } from '../checkin/SymptomManageModal';
import { Button } from '../ui/Button';

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
  const {
    trackedSymptomIds,
    isLoading,
    saveSelections,
  } = useSymptomSelections();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const packedIds = useMemo(
    () => packShortWithLong(trackedSymptomIds),
    [trackedSymptomIds],
  );

  if (isLoading) return null;

  return (
    <>
      <Card variant="elevated">
        <div className="flex flex-wrap items-center gap-2">
          <Zap className="h-[18px] w-[18px] shrink-0 text-sage-500" aria-hidden />
          <p className="text-xs font-medium uppercase tracking-wide text-sage-500">Quick log</p>
          <span className="text-sm text-sage-400">in the moment · ~5 sec</span>
        </div>

        {trackedSymptomIds.length > 0 ? (
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {packedIds.map((id) => {
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
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-sage-200 bg-sage-50/50 p-4">
            <p className="text-sm font-medium text-sage-700">No Quick Log symptoms yet</p>
            <p className="mt-1 text-sm text-sage-500">
              Add the concerns you want to tap quickly — including MRS symptoms like irritability
              if you track them day to day. Or search the library for a one-off log.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setShortcutsOpen(true)}>
                Add symptoms
              </Button>
              <Button size="sm" variant="secondary" onClick={() => openSheet()}>
                Log something else
              </Button>
            </div>
          </div>
        )}

        {trackedSymptomIds.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              className="text-sm font-medium text-sage-600 underline hover:text-sage-700"
            >
              Edit personal symptoms
            </button>
            <button
              type="button"
              onClick={() => openSheet()}
              className="text-sm font-medium text-sage-500 underline hover:text-sage-700"
            >
              Log something else
            </button>
          </div>
        )}

        <QuickLogSheet />
      </Card>

      <SymptomManageModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        trackedIds={trackedSymptomIds}
        onSave={async (nextTrackedIds) =>
          saveSelections(
            nextTrackedIds.map((symptom_id) => ({
              symptom_id,
              is_watch_symptom: true,
            })),
            nextTrackedIds,
          )
        }
      />
    </>
  );
}
