import { useAuthStore } from '../../stores/authStore';
import { getStageDashboardDescription } from '../../lib/strawStaging';
import { Card } from '../ui/Card';

export function StrawStageCard() {
  const profile = useAuthStore((s) => s.profile);
  const stageCode = profile?.straw_stage;
  const stageLabel = profile?.straw_stage_label;
  const description = getStageDashboardDescription(stageCode);

  if (!stageCode || !stageLabel || !description) return null;

  return (
    <Card variant="elevated" padding="md">
      <p className="text-xs font-medium uppercase tracking-wide text-sage-500">Your stage</p>
      <h2 className="mt-1 font-display text-xl text-sage-800">{stageLabel}</h2>
      <p className="mt-3 text-sm leading-relaxed text-sage-600">{description}</p>
      <p className="mt-4 text-xs text-sage-400">
        Staging based on STRAW+10, the research standard for reproductive aging.
      </p>
    </Card>
  );
}
