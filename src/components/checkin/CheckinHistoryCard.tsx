import { memo } from 'react';
import type { SymptomCheckin } from '../../types/database';
import { formatDateLong } from '../../utils/formatters';
import { getTopConcerns, hasMRSData, MRS_CANONICAL_KEYS, formatDailyChannels, type MRSScoresMap, type MRSSymptomKey } from '../../utils/checkinHelpers';
import { MRSScoreBadge } from './MRSScoreBadge';
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
    <div className="rounded-xl border border-sand-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-sage-800">
            {formatDateLong(checkin.checkin_date)}
            {checkin.is_backdated && (
              <span className="ml-2 rounded bg-sand-100 px-1.5 py-0.5 text-xs font-normal text-sage-400">
                logged later
              </span>
            )}
          </p>
          <div className="mt-2">
            {hasMRSData(checkin) ? (
              <MRSScoreBadge total={checkin.total_score} compact showDot />
            ) : (
              <span className="text-sm text-sage-500">Pulse</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end text-right">
          <p className="text-xs text-sage-500">{formatDailyChannels(checkin)}</p>
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
