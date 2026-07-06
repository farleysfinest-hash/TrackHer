import { memo } from 'react';
import type { SymptomCheckin } from '../../types/database';
import { formatDateLong } from '../../utils/formatters';
import { getTopConcerns, type MRSScoresMap, type MRSSymptomKey } from '../../utils/checkinHelpers';
import { MRS_SYMPTOM_KEYS } from '../../utils/checkinHelpers';
import { MRSScoreBadge } from './MRSScoreBadge';
import { ProgressRing } from '../ui/ProgressRing';
import { Button } from '../ui/Button';

interface CheckinHistoryCardProps {
  checkin: SymptomCheckin;
  onViewDetails: (checkin: SymptomCheckin) => void;
}

function checkinToScores(checkin: SymptomCheckin): MRSScoresMap {
  const scores = {} as MRSScoresMap;
  for (const key of MRS_SYMPTOM_KEYS) {
    scores[key] = checkin[key] as MRSScoresMap[MRSSymptomKey];
  }
  return scores;
}

function CheckinHistoryCardComponent({ checkin, onViewDetails }: CheckinHistoryCardProps) {
  const scores = checkinToScores(checkin);
  const top = getTopConcerns(scores, 2);

  return (
    <div className="rounded-xl border border-sand-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-sage-800">{formatDateLong(checkin.checkin_date)}</p>
          <div className="mt-2">
            <MRSScoreBadge total={checkin.total_score} compact showDot />
          </div>
        </div>
        {checkin.overall_wellbeing !== null && (
          <div className="text-center">
            <ProgressRing value={checkin.overall_wellbeing} max={10} size={48} />
            <p className="mt-1 text-xs text-sage-400">Wellbeing</p>
          </div>
        )}
      </div>

      {top.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-sage-500">
          {top.map((t) => (
            <span key={t.key}>
              {t.label.split(' ')[0]}… ({t.score})
            </span>
          ))}
        </div>
      )}

      {checkin.notes && (
        <p className="mt-3 truncate text-sm italic text-sage-400">
          &ldquo;{checkin.notes}&rdquo;
        </p>
      )}

      <Button variant="ghost" size="sm" className="mt-4" onClick={() => onViewDetails(checkin)}>
        View Details
      </Button>
    </div>
  );
}

export const CheckinHistoryCard = memo(CheckinHistoryCardComponent);
