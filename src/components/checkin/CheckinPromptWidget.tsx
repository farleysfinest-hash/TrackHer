import { Link } from 'react-router-dom';
import { Leaf, ClipboardList } from 'lucide-react';
import type { SymptomCheckin } from '../../types/database';
import { DailyChannelsDisplay } from '../ui/DailyChannelsDisplay';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { MrsScoreDisplay } from './MrsScoreDisplay';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { DashboardCardHeader } from '../dashboard/DashboardCardHeader';

export interface PulsePromptCardProps {
  hasCheckedInToday: boolean;
  hasPulseToday: boolean;
  hasFullMrsToday: boolean;
  todaysCheckin: SymptomCheckin | null;
  isLoading?: boolean;
  /** When set (e.g. already on /checkin), start the pulse flow instead of navigating. */
  onStart?: () => void;
}

export interface WeeklyCheckinPromptCardProps {
  hasFullMrsToday: boolean;
  weeklyMinimumMet: boolean;
  isDue: boolean;
  todaysCheckin: SymptomCheckin | null;
  daysSinceLastCheckin: number | null;
  isLoading?: boolean;
  /** When set (e.g. already on /checkin), start/edit the full flow instead of navigating. */
  onStart?: () => void;
}

export function PulsePromptCard({
  hasCheckedInToday,
  hasPulseToday,
  hasFullMrsToday,
  todaysCheckin,
  isLoading = false,
  onStart,
}: PulsePromptCardProps) {
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
        <DashboardCardHeader
          icon={Leaf}
          eyebrow="Daily pulse"
          title={hasFullMrsToday ? 'Covered today' : 'Logged today'}
          description={
            hasFullMrsToday
              ? 'Energy, mood, and sleep were captured with your check-in.'
              : 'A short read on energy, mood, and sleep — once a day.'
          }
          done
        />
        {hasPulseToday && (
          <div className="mt-3 text-sm">
            <DailyChannelsDisplay checkin={todaysCheckin} />
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <DashboardCardHeader
        icon={Leaf}
        eyebrow="Daily pulse"
        title="How are you feeling today?"
        description="Ten seconds on energy, mood, and sleep — between weekly check-ins."
      />
      <div className="mt-4">
        {onStart ? (
          <Button className="w-full sm:w-auto" onClick={onStart}>
            Quick pulse (~10 sec)
          </Button>
        ) : (
          <Link to="/checkin?mode=quick" className="block">
            <Button className="w-full sm:w-auto">Quick pulse (~10 sec)</Button>
          </Link>
        )}
      </div>
    </Card>
  );
}

export function WeeklyCheckinPromptCard({
  hasFullMrsToday,
  weeklyMinimumMet,
  isDue,
  todaysCheckin,
  daysSinceLastCheckin,
  isLoading = false,
  onStart,
}: WeeklyCheckinPromptCardProps) {
  const isComeback = daysSinceLastCheckin !== null && daysSinceLastCheckin >= 7;

  if (isLoading) {
    return (
      <Card className="flex justify-center py-8">
        <LoadingSpinner />
      </Card>
    );
  }

  if (hasFullMrsToday && todaysCheckin) {
    return (
      <Card variant="elevated" padding="lg">
        <DashboardCardHeader
          icon={ClipboardList}
          eyebrow="Weekly check-in"
          title="Logged today"
          description="You've hit this week's minimum. More check-ins on other days sharpen your trends — come back tomorrow anytime."
          done
        />
        <div className="mt-3 text-sm">
          <MrsScoreDisplay checkin={todaysCheckin} compact showDot />
        </div>
        <div className="mt-4">
          {onStart ? (
            <button
              type="button"
              onClick={onStart}
              className="text-sm text-sage-500 underline hover:text-sage-700"
            >
              Edit today&apos;s check-in
            </button>
          ) : (
            <Link to="/checkin" className="text-sm text-sage-500 underline hover:text-sage-700">
              Edit today&apos;s check-in
            </Link>
          )}
        </div>
      </Card>
    );
  }

  if (weeklyMinimumMet) {
    return (
      <Card variant="elevated" padding="lg">
        <DashboardCardHeader
          icon={ClipboardList}
          eyebrow="Weekly check-in"
          title="Minimum met this week"
          description="You've done the once-a-week clinical symptom scale. Extra check-ins are welcome — more data makes patterns clearer."
          done
        />
        <div className="mt-4">
          {onStart ? (
            <Button variant="secondary" className="w-full sm:w-auto" onClick={onStart}>
              Log another check-in (~2 min)
            </Button>
          ) : (
            <Link to="/checkin?mode=full" className="block">
              <Button variant="secondary" className="w-full sm:w-auto">
                Log another check-in (~2 min)
              </Button>
            </Link>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg">
      <DashboardCardHeader
        icon={ClipboardList}
        eyebrow="Weekly check-in"
        title={
          isComeback ? 'Welcome back' : isDue ? 'Due this week' : 'Your weekly symptom scale'
        }
        description={
          isComeback
            ? 'A full check-in covers the past week on the clinical scale — about two minutes.'
            : isDue
              ? 'About two minutes on the Menopause Rating Scale. Once a week is the minimum; more is better.'
              : 'Not required yet this week — you can still log early if you want.'
        }
      />
      <div className="mt-4">
        {onStart ? (
          <Button className="w-full sm:w-auto" onClick={onStart}>
            {isDue || isComeback ? 'Weekly check-in (~2 min)' : 'Check in early (~2 min)'}
          </Button>
        ) : (
          <Link to="/checkin?mode=full" className="block">
            <Button className="w-full sm:w-auto">
              {isDue || isComeback ? 'Weekly check-in (~2 min)' : 'Check in early (~2 min)'}
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}
