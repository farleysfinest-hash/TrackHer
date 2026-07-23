import { memo } from 'react';
import type { SymptomCheckin } from '../../types/database';
import { formatDateLong } from '../../utils/formatters';
import { getTopConcerns, MRS_CANONICAL_KEYS, type MRSScoresMap, type MRSSymptomKey } from '../../utils/checkinHelpers';
import { DailyChannelsDisplay } from '../ui/DailyChannelsDisplay';
import { MrsScoreDisplay } from './MrsScoreDisplay';
import { Button } from '../ui/Button';

interface CheckinHistoryCardProps {
  checkin: SymptomCheckin;
  onViewDetails: (checkin: SymptomCheckin) => void;
}

function checkinToScores(checkin: SymptomCheckin): MRSScoresMap {
  const scores = {} as MRSScoresMap;
  for (const key of MRS_CANONICAL_KEYS) {
    scores[key] = checkin[key] as MRSScoresMap[MRSSymptomKey];
  }
  return scores;
}

function CheckinHistoryCardComponent({ checkin, onViewDetails }: CheckinHistoryCardProps) {
  const scores = checkinToScores(checkin);
  const top = getTopConcerns(scores, 2);

  return (
    <div className="min-w-0 rounded-xl border border-sand-200 bg-sand-50 p-5 shadow-sm">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sage-800">
            {formatDateLong(checkin.checkin_date)}
            {checkin.is_backdated && (
              <span className="ml-2 rounded bg-sand-100 px-1.5 py-0.5 text-xs font-normal text-sage-400">
                logged later
              </span>
            )}
          </p>
          <div className="mt-2 min-w-0">
            <MrsScoreDisplay checkin={checkin} compact showDot />
          </div>
        </div>
        <div className="min-w-0 sm:shrink sm:pt-0.5">
          <DailyChannelsDisplay checkin={checkin} compact />
        </div>
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
