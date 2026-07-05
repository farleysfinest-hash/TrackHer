import {
  getMRSSeverityTier,
  getMRSSeverityColor,
  getMRSSeverityLabel,
  getMRSSeverityDot,
} from '../../utils/checkinHelpers';

interface MRSScoreBadgeProps {
  total: number;
  somatic?: number;
  psychological?: number;
  urogenital?: number;
  compact?: boolean;
  showDot?: boolean;
}

export function MRSScoreBadge({
  total,
  somatic,
  psychological,
  urogenital,
  compact = false,
  showDot = false,
}: MRSScoreBadgeProps) {
  const tier = getMRSSeverityTier(total);
  const colorClass = getMRSSeverityColor(tier);

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-medium ${colorClass}`}>
        {showDot && (
          <span className={`h-2 w-2 rounded-full ${getMRSSeverityDot(tier)}`} />
        )}
        MRS: {total}/64
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <p className={`font-display text-lg ${colorClass}`}>MRS Score: {total}/64</p>
      <p className="text-sm text-sage-500">{getMRSSeverityLabel(tier)}</p>
      {somatic !== undefined && psychological !== undefined && urogenital !== undefined && (
        <div className="mt-2 space-y-0.5 text-sm text-sage-600">
          <p>Vasomotor: {somatic}/12</p>
          <p>Psychological: {psychological}/20</p>
          <p>Urogenital: {urogenital}/12</p>
        </div>
      )}
    </div>
  );
}
