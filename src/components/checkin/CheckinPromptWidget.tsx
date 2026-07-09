import { Link } from 'react-router-dom';
import { Leaf, CheckCircle2 } from 'lucide-react';
import type { SymptomCheckin } from '../../types/database';
import { hasMRSData } from '../../utils/checkinHelpers';
import type { CheckinCoverage } from '../../hooks/useCheckinStatus';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { MRSScoreBadge } from './MRSScoreBadge';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export interface CheckinPromptWidgetProps {
  hasCheckedInToday: boolean;
  todaysCheckin: SymptomCheckin | null;
  coverage: CheckinCoverage | null;
  isDue: boolean;
  daysSinceLastCheckin: number | null;
  isLoading: boolean;
}

function CoverageLine({ coverage }: { coverage: CheckinCoverage }) {
  if (coverage.covered < 2) return null;
  return (
    <p className="mt-3 text-sm text-sage-500">
      {coverage.covered} of the last {coverage.window} days logged
    </p>
  );
}

export function CheckinPromptWidget({
  hasCheckedInToday,
  todaysCheckin,
  coverage,
  isDue,
  daysSinceLastCheckin,
  isLoading,
}: CheckinPromptWidgetProps) {
  if (isLoading) {
    return (
      <Card className="flex justify-center py-8">
        <LoadingSpinner />
      </Card>
    );
  }

  if (hasCheckedInToday && todaysCheckin) {
    return (
      <Card variant="elevated">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
          <div className="flex-1">
            <h2 className="font-display text-lg text-sage-800">Checked in today</h2>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-sage-600">
              {todaysCheckin.overall_wellbeing !== null && (
                <span>Wellbeing: {todaysCheckin.overall_wellbeing}/10</span>
              )}
              {hasMRSData(todaysCheckin) && (
                <MRSScoreBadge total={todaysCheckin.total_score} compact showDot />
              )}
            </div>
            {coverage && <CoverageLine coverage={coverage} />}
          </div>
        </div>
      </Card>
    );
  }

  const isComeback = daysSinceLastCheckin !== null && daysSinceLastCheckin >= 7;

  const bodyCopy = isComeback
    ? 'Life happens. One check-in covering the past week catches your record right up — and you can backfill a missed day if you want.'
    : daysSinceLastCheckin !== null && daysSinceLastCheckin > 0
      ? `Your last check-in was ${daysSinceLastCheckin} day${daysSinceLastCheckin !== 1 ? 's' : ''} ago.`
      : 'Take a moment to log how you feel today.';

  return (
    <Card variant="elevated">
      <div className="flex items-start gap-3">
        <Leaf className="h-6 w-6 shrink-0 text-sage-500" />
        <div className="flex-1">
          <h2 className="font-display text-lg text-sage-800">
            {isComeback ? 'Welcome back' : isDue ? 'Time to check in' : 'How are you feeling?'}
          </h2>
          <p className="mt-1 text-sm text-sage-500">{bodyCopy}</p>
          <Link to="/checkin" className="mt-4 inline-block">
            <Button>Check In Now</Button>
          </Link>
          {coverage && <CoverageLine coverage={coverage} />}
        </div>
      </div>
    </Card>
  );
}
