import type { InstrumentDefinition, InstrumentScore } from '../../types/instruments';
import { getSeverityLabel } from '../../data/instruments/scoring';
import {
  getMRSSeverityColor,
  getMRSSeverityDot,
  getMRSSeverityTier,
  getIncompleteMrsMessage,
  type MRSSeverityLevel,
} from '../../utils/checkinHelpers';

interface InstrumentScoreBadgeProps {
  instrument: InstrumentDefinition;
  score: InstrumentScore;
  compact?: boolean;
  showDot?: boolean;
}

function MiniSeverityBadge({ tier }: { tier: MRSSeverityLevel }) {
  return (
    <span
      className={`ml-1 rounded-full bg-sand-100 px-1.5 py-0.5 text-[10px] font-medium ${getMRSSeverityColor(tier)}`}
    >
      {getSeverityLabel(tier)}
    </span>
  );
}

export function InstrumentScoreBadge({
  instrument,
  score,
  compact = false,
  showDot = false,
}: InstrumentScoreBadgeProps) {
  if (!score.isComplete || score.total === null || score.totalSeverity === null) {
    const message = getIncompleteMrsMessage(score.missingItemCount);
    if (compact) {
      return <span className="text-sm text-sage-600">Incomplete check-in</span>;
    }
    return <p className="text-sm text-sage-600">{message}</p>;
  }

  const tier = score.totalSeverity as MRSSeverityLevel;
  const colorClass = getMRSSeverityColor(tier);

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-medium ${colorClass}`}>
        {showDot && <span className={`h-2 w-2 rounded-full ${getMRSSeverityDot(tier)}`} />}
        {instrument.abbreviation}: {score.total}/{instrument.totalScoreRange[1]}
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className={`font-display text-lg ${colorClass}`}>
          {instrument.abbreviation} Score: {score.total}/{instrument.totalScoreRange[1]}
        </p>
        <MiniSeverityBadge tier={tier} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-sage-600">
        {instrument.subscales.map((sub) => {
          const subScore = score.subscales[sub.id];
          if (!subScore || subScore.score === null || subScore.severity === null) return null;
          return (
            <span key={sub.id}>
              {sub.label}: {subScore.score}/{sub.maxScore}
              <MiniSeverityBadge tier={subScore.severity as MRSSeverityLevel} />
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** @deprecated Use InstrumentScoreBadge — kept for backward compatibility */
export function MRSScoreBadge({
  total,
  somatic,
  psychological,
  urogenital,
  totalSeverity,
  somaticSeverity,
  psychologicalSeverity,
  urogenitalSeverity,
  compact = false,
  showDot = false,
}: {
  total: number;
  somatic?: number;
  psychological?: number;
  urogenital?: number;
  totalSeverity?: MRSSeverityLevel;
  somaticSeverity?: MRSSeverityLevel;
  psychologicalSeverity?: MRSSeverityLevel;
  urogenitalSeverity?: MRSSeverityLevel;
  compact?: boolean;
  showDot?: boolean;
}) {
  const tier = totalSeverity ?? getMRSSeverityTier(total);
  const colorClass = getMRSSeverityColor(tier);

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-medium ${colorClass}`}>
        {showDot && <span className={`h-2 w-2 rounded-full ${getMRSSeverityDot(tier)}`} />}
        MRS: {total}/44
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className={`font-display text-lg ${colorClass}`}>MRS Score: {total}/44</p>
        <MiniSeverityBadge tier={tier} />
      </div>
      {somatic !== undefined && psychological !== undefined && urogenital !== undefined && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-sage-600">
          <span>
            Psychological: {psychological}/16
            {psychologicalSeverity && <MiniSeverityBadge tier={psychologicalSeverity} />}
          </span>
          <span>
            Somatic: {somatic}/16
            {somaticSeverity && <MiniSeverityBadge tier={somaticSeverity} />}
          </span>
          <span>
            Urogenital: {urogenital}/12
            {urogenitalSeverity && <MiniSeverityBadge tier={urogenitalSeverity} />}
          </span>
        </div>
      )}
    </div>
  );
}
