import { useMemo } from 'react';
import { StatCard } from '../ui/StatCard';
import { hasMRSData, hasPartialMRSData, getDailySignal } from '../../utils/checkinHelpers';
import { addDaysISO, todayISO } from '../../utils/localDate';
import type { SymptomCheckin } from '../../types/database';

interface ScoreSummaryCardsProps {
  checkins: SymptomCheckin[];
}

export function ScoreSummaryCards({ checkins }: ScoreSummaryCardsProps) {
  const sorted = useMemo(
    () => [...checkins].sort((a, b) => b.checkin_date.localeCompare(a.checkin_date)),
    [checkins],
  );

  const mrsCheckins = useMemo(() => sorted.filter(hasMRSData), [sorted]);
  const latestMrs = mrsCheckins[0];
  const latestPartialMrs = useMemo(
    () => sorted.find((c) => hasPartialMRSData(c) && !hasMRSData(c)),
    [sorted],
  );
  const latest = sorted[0];
  const today = todayISO();
  const thirtyDaysAgo = addDaysISO(today, -30);

  const mrsTrend = useMemo(() => {
    if (!latestMrs) return null;
    const older = [...mrsCheckins]
      .filter((c) => c.checkin_date <= thirtyDaysAgo)
      .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date))[0];
    if (!older) return null;
    const diff = latestMrs.total_score - older.total_score;
    if (diff === 0) {
      return {
        headline: 'No change',
        detail: 'same as a month ago',
        improving: false,
      };
    }
    const improving = diff < 0;
    return {
      headline: improving ? 'Easing' : 'Worth watching',
      detail: `${improving ? '↓' : '↑'} ${Math.abs(diff)} pts vs. a month ago`,
      improving,
    };
  }, [latestMrs, mrsCheckins, thirtyDaysAgo]);

  const energySignal = latest ? getDailySignal(latest) : null;

  const channelSubtext = latest
    ? [
        latest.mood_level != null ? `Mood ${latest.mood_level}` : null,
        latest.sleep_quality != null ? `Sleep ${latest.sleep_quality}/5` : null,
      ]
        .filter(Boolean)
        .join(' · ') || undefined
    : undefined;

  const todayStr = todayISO();
  const monthKey = todayStr.slice(0, 7);
  const daysLoggedThisMonth = new Set(
    sorted.filter((c) => c.checkin_date.slice(0, 7) === monthKey).map((c) => c.checkin_date),
  ).size;
  const monthCountValue = daysLoggedThisMonth >= 1 ? String(daysLoggedThisMonth) : '—';

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="MRS Score"
        value={
          latestMrs
            ? latestMrs.total_score
            : latestPartialMrs
              ? 'Incomplete check-in'
              : '—'
        }
        subtext={
          latestMrs
            ? `/44 · Psych ${latestMrs.psychological_score ?? '—'} · Som ${latestMrs.somatic_score ?? '—'} · Uro ${latestMrs.urogenital_score ?? '—'}`
            : latestPartialMrs
              ? 'Finish your check-in to see a score'
              : '/44'
        }
      />
      <StatCard
        label="Energy"
        value={energySignal ?? '—'}
        subtext={channelSubtext ?? '/5'}
      />
      <StatCard
        label="Symptom burden"
        value={mrsTrend?.headline ?? '—'}
        subtext={mrsTrend?.detail}
        color={mrsTrend?.improving ? '#6f7f58' : undefined}
      />
      <StatCard
        label="Days logged"
        value={monthCountValue}
        subtext="days logged this month"
        color={daysLoggedThisMonth >= 1 ? '#5a8a4a' : undefined}
      />
    </div>
  );
}
