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
import { DashboardCardHeader } from './DashboardCardHeader';
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
  return <Icon className="h-4 w-4" aria-hidden />;
}

export function QuickLogWidget() {
  const openSheet = useQuickLogStore((s) => s.openSheet);
  const { watchSymptomIds, isLoading } = useSymptomSelections();

  if (isLoading) return null;

  if (watchSymptomIds.length === 0) return null;

  return (
    <Card variant="elevated">
      <DashboardCardHeader
        icon={Zap}
        eyebrow="Quick log"
        title="Log a symptom"
        description="In the moment — about 5 seconds."
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {watchSymptomIds.map((id) => {
          const def = getSymptomByKey(id);
          if (!def) return null;
          return (
            <button
              key={id}
              type="button"
              onClick={() => openSheet(id)}
              className="inline-flex items-center gap-2 rounded-full border border-sage-200 bg-sage-50 px-3 py-1.5 text-sm font-medium text-sage-700 transition-colors hover:border-sage-400 hover:bg-sage-100 active:scale-[0.98]"
            >
              <SymptomIcon bodySystem={def.bodySystem} />
              {getSymptomChipLabel(def)}
            </button>
          );
        })}
      </div>

      <QuickLogSheet />
    </Card>
  );
}
