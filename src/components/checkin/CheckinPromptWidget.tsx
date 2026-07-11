import { Link } from 'react-router-dom';
import { Leaf, CheckCircle2 } from 'lucide-react';
import type { SymptomCheckin } from '../../types/database';
import { DailyChannelsDisplay } from '../ui/DailyChannelsDisplay';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { MrsScoreDisplay } from './MrsScoreDisplay';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export interface CheckinPromptWidgetProps {
  hasCheckedInToday: boolean;
  todaysCheckin: SymptomCheckin | null;
  isDue: boolean;
  daysSinceLastCheckin: number | null;
  isLoading: boolean;
}

export function CheckinPromptWidget({
  hasCheckedInToday,
  todaysCheckin,
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
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
              <DailyChannelsDisplay checkin={todaysCheckin} />
              <MrsScoreDisplay checkin={todaysCheckin} compact showDot />
            </div>
            {isDue && (
              <p className="mt-3 text-sm text-sage-500">
                Your weekly check-in is ready whenever you are.
              </p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  const isComeback = daysSinceLastCheckin !== null && daysSinceLastCheckin >= 7;

  return (
    <Card variant="elevated">
      <div className="flex items-start gap-3">
        <Leaf className="h-6 w-6 shrink-0 text-sage-500" />
        <div className="flex-1">
          <h2 className="font-display text-lg text-sage-800">
            {isComeback
              ? 'Welcome back'
              : isDue
                ? 'Time for your weekly check-in'
                : 'How are you feeling today?'}
          </h2>

          {isComeback ? (
            <>
              <p className="mt-1 text-sm text-sage-500">
                Pick up right where you are — a 10-second pulse restarts your record today, and your
                weekly check-in covers the past week whenever you're ready.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link to="/checkin?mode=quick">
                  <Button>Quick pulse (~10 sec)</Button>
                </Link>
                <Link
                  to="/checkin?mode=full"
                  className="text-sm text-sage-500 underline hover:text-sage-700"
                >
                  Do a full check-in instead
                </Link>
              </div>
            </>
          ) : isDue ? (
            <>
              <p className="mt-1 text-sm text-sage-500">
                Your full check-in takes about two minutes and covers the past week.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link to="/checkin?mode=full">
                  <Button>Weekly check-in (~2 min)</Button>
                </Link>
                <Link
                  to="/checkin?mode=quick"
                  className="text-sm text-sage-500 underline hover:text-sage-700"
                >
                  Just a quick pulse today
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-sage-500">
                A 10-second pulse keeps your record alive today.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link to="/checkin?mode=quick">
                  <Button>Quick pulse (~10 sec)</Button>
                </Link>
                <Link
                  to="/checkin?mode=full"
                  className="text-sm text-sage-500 underline hover:text-sage-700"
                >
                  Do a full check-in instead
                </Link>
              </div>
            </>
          )}

          {/* Presence is celebrated in summary cards; this widget only invites. */}
        </div>
      </div>
    </Card>
  );
}
