import { useEffect } from 'react';
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
import { useSymptomSelections, seedDevSymptomSelectionsIfEmpty } from '../../hooks/useSymptomSelections';
import { getSymptomByKey, getSymptomChipLabel } from '../../data/symptoms';
import type { SymptomBodySystem } from '../../types/symptoms';
import { QuickLogSheet } from './QuickLogSheet';
import { RecentLogs } from './RecentLogs';
import { IS_DEV_MODE } from '../../lib/devMode';

const ICON_BY_SYSTEM: Partial<Record<SymptomBodySystem, LucideIcon>> = {
  vasomotor: Flame,
  mood: Heart,
  cognitive: Brain,
  sleep: Moon,
  energy: Zap,
};

function SymptomIcon({ bodySystem }: { bodySystem: SymptomBodySystem }) {
  const Icon = ICON_BY_SYSTEM[bodySystem] ?? Activity;
  return <Icon className="h-4 w-4" aria-hidden />;
}

export function QuickLogWidget() {
  const openSheet = useQuickLogStore((s) => s.openSheet);
  const { watchSymptomIds, isLoading } = useSymptomSelections();

  useEffect(() => {
    if (IS_DEV_MODE) seedDevSymptomSelectionsIfEmpty();
  }, []);

  if (isLoading) return null;

  if (watchSymptomIds.length === 0) return null;

  return (
    <section className="rounded-xl border border-sand-200 bg-white p-5">
      <h2 className="font-display text-lg text-sage-800">Quick log</h2>
      <p className="mt-1 text-sm text-sage-500">
        Log a watch symptom in the moment — takes about 5 seconds.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {watchSymptomIds.map((id) => {
          const def = getSymptomByKey(id);
          if (!def) return null;
          return (
            <button
              key={id}
              type="button"
              onClick={() => openSheet(id)}
              className="inline-flex items-center gap-2 rounded-full border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm font-medium text-sage-700 transition-colors hover:border-sage-400 hover:bg-sage-100 active:scale-[0.98]"
            >
              <SymptomIcon bodySystem={def.bodySystem} />
              {getSymptomChipLabel(def)}
            </button>
          );
        })}
      </div>

      <RecentLogs />
      <QuickLogSheet />
    </section>
  );
}
