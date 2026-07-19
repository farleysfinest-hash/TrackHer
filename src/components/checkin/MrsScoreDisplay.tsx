import type { SymptomCheckin } from '../../types/database';
import {
  countMissingMrsFromCheckin,
  getIncompleteMrsMessage,
  hasMRSData,
  hasPartialMRSData,
} from '../../utils/checkinHelpers';
import { MRSScoreBadge } from './MRSScoreBadge';

interface MrsScoreDisplayProps {
  checkin: SymptomCheckin;
  compact?: boolean;
  showDot?: boolean;
  onFinish?: () => void;
}

export function MrsScoreDisplay({
  checkin,
  compact = false,
  showDot = false,
  onFinish,
}: MrsScoreDisplayProps) {
  if (hasMRSData(checkin)) {
    return <MRSScoreBadge total={checkin.total_score} compact={compact} showDot={showDot} />;
  }

  if (hasPartialMRSData(checkin)) {
    const message = getIncompleteMrsMessage(countMissingMrsFromCheckin(checkin));
    if (compact) {
      return <span className="text-sm text-sage-600">Incomplete check-in</span>;
    }
    return (
      <div className="space-y-2 text-sm text-sage-600">
        <p>{message}</p>
        {onFinish && (
          <button
            type="button"
            onClick={onFinish}
            className="font-medium text-sage-700 underline hover:text-sage-800"
          >
            Finish this check-in
          </button>
        )}
      </div>
    );
  }

  if (checkin.checkin_type === 'full') {
    return <span className="text-sm text-sage-500">Incomplete check-in</span>;
  }
  return <span className="text-sm text-sage-500">Pulse</span>;
}
