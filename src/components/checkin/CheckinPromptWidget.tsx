import { Link } from 'react-router-dom';
import { Leaf, Flame, CheckCircle2 } from 'lucide-react';
import type { SymptomCheckin } from '../../types/database';
import { hasMRSData } from '../../utils/checkinHelpers';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { MRSScoreBadge } from './MRSScoreBadge';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export interface CheckinPromptWidgetProps {
  hasCheckedInToday: boolean;
  todaysCheckin: SymptomCheckin | null;
  streak: number;
  isDue: boolean;
  daysSinceLastCheckin: number | null;
  isLoading: boolean;
}

export function CheckinPromptWidget({
  hasCheckedInToday,
  todaysCheckin,
  streak,
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
            {streak >= 2 && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-clay-500">
                <Flame className="h-4 w-4" />
                {streak}-day streak
              </p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <div className="flex items-start gap-3">
        <Leaf className="h-6 w-6 shrink-0 text-sage-500" />
        <div className="flex-1">
          <h2 className="font-display text-lg text-sage-800">
            {isDue ? 'Time to check in' : 'How are you feeling?'}
          </h2>
          <p className="mt-1 text-sm text-sage-500">
            {daysSinceLastCheckin !== null && daysSinceLastCheckin > 0
              ? `Your last check-in was ${daysSinceLastCheckin} day${daysSinceLastCheckin !== 1 ? 's' : ''} ago.`
              : 'Take a moment to log how you feel today.'}
          </p>
          <Link to="/checkin" className="mt-4 inline-block">
            <Button>Check In Now</Button>
          </Link>
          {streak >= 2 && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-clay-500">
              <Flame className="h-4 w-4" />
              {streak}-day streak
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
