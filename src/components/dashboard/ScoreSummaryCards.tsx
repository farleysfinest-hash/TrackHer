import { useMemo } from 'react';
import { StatCard } from '../ui/StatCard';
import { useAuthStore } from '../../stores/authStore';
import { getMRSSeverityTier, hasMRSData } from '../../utils/checkinHelpers';
import { MRS_SEVERITY_HEX, getWellbeingHex } from '../../utils/chartHelpers';
import type { SymptomCheckin } from '../../types/database';

function addDaysISO(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return dt.toISOString().split('T')[0];
}

interface ScoreSummaryCardsProps {
  checkins: SymptomCheckin[];
  streak: number;
}

export function ScoreSummaryCards({ checkins, streak }: ScoreSummaryCardsProps) {
  const frequency = useAuthStore((s) => s.profile?.checkin_frequency ?? 'daily');

  const sorted = useMemo(
    () => [...checkins].sort((a, b) => b.checkin_date.localeCompare(a.checkin_date)),
    [checkins],
  );

  const mrsCheckins = useMemo(() => sorted.filter(hasMRSData), [sorted]);
  const latestMrs = mrsCheckins[0];
  const latest = sorted[0];
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = addDaysISO(today, -30);

  const mrsTrend = useMemo(() => {
    if (!latestMrs) return null;
    const older = [...mrsCheckins]
      .filter((c) => c.checkin_date <= thirtyDaysAgo)
      .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date))[0];
    if (!older) return null;
    const diff = latestMrs.total_score - older.total_score;
    if (diff === 0) {
      return { direction: 'flat' as const, label: '→ No change', isPositive: true };
    }
    const improving = diff < 0;
    return {
      direction: improving ? ('down' as const) : ('up' as const),
      label: `${improving ? '↓' : '↑'} ${Math.abs(diff)} pts`,
      isPositive: improving,
    };
  }, [latestMrs, mrsCheckins, thirtyDaysAgo]);

  const mrsColor = latestMrs
    ? MRS_SEVERITY_HEX[getMRSSeverityTier(latestMrs.total_score)]
    : undefined;

  const wellbeingColor =
    latest?.overall_wellbeing != null ? getWellbeingHex(latest.overall_wellbeing) : undefined;

  const streakUnit =
    frequency === 'weekly' ? 'weeks' : frequency === 'monthly' ? 'months' : 'days';

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="MRS Score"
        value={latestMrs?.total_score ?? '—'}
        subtext={`/44 · Psych ${latestMrs?.psychological_score ?? '—'} · Som ${latestMrs?.somatic_score ?? '—'} · Uro ${latestMrs?.urogenital_score ?? '—'}`}
        color={mrsColor}
      />
      <StatCard
        label="Wellbeing"
        value={latest?.overall_wellbeing ?? '—'}
        subtext="/10"
        color={wellbeingColor}
      />
      <StatCard
        label="30-Day Change"
        value={mrsTrend?.label ?? '—'}
        color={
          mrsTrend
            ? mrsTrend.isPositive
              ? '#5a8a4a'
              : mrsTrend.direction === 'flat'
                ? undefined
                : '#dc2626'
            : undefined
        }
      />
      <StatCard label="Streak" value={streak || '—'} subtext={streakUnit} />
    </div>
  );
}
