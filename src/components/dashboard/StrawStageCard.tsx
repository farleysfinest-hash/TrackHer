import { useStageProfile } from '../../hooks/useStageProfile';
import { Card } from '../ui/Card';

export function StrawStageCard() {
  const stageProfile = useStageProfile();

  if (!stageProfile.stage || !stageProfile.label || !stageProfile.description) return null;

  return (
    <Card variant="elevated" padding="md">
      <p className="text-xs font-medium uppercase tracking-wide text-sage-500">Your stage</p>
      <h2 className="mt-1 font-display text-xl text-sage-800">{stageProfile.label}</h2>
      <p className="mt-3 text-sm leading-relaxed text-sage-600">{stageProfile.description}</p>
      {stageProfile.typicalSymptomClusters.length > 0 && (
        <p className="mt-3 text-xs text-sage-400">
          Commonly reported at this stage (population-typical, not predictive):{' '}
          {stageProfile.typicalSymptomClusters.join(' · ')}
        </p>
      )}
      <p className="mt-4 text-xs text-sage-400">
        Staging based on STRAW+10, the research standard for reproductive aging.
      </p>
    </Card>
  );
}
