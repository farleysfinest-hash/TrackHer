import type { Profile } from '../../types/database';
import type { PeriodChanges, PeriodsStatus } from '../../lib/strawStaging';
import { formatChartDateLong } from '../chartHelpers';
import { daysBetweenISO, parseISODate, todayISO } from '../localDate';

export function computeAge(dateOfBirth: string | null, today = todayISO()): number | null {
  if (!dateOfBirth) return null;
  const dob = parseISODate(dateOfBirth);
  const current = parseISODate(today);
  let age = current.year - dob.year;
  const monthDiff = current.month - dob.month;
  if (monthDiff < 0 || (monthDiff === 0 && current.day < dob.day)) {
    age -= 1;
  }
  return age;
}

export function formatStagingBasis(profile: Profile): string {
  const { periods_status, period_changes, straw_stage, menopause_cause } = profile;

  if (straw_stage === 'surgical') {
    return 'Self-reported: surgical removal of ovaries';
  }
  if (straw_stage === 'iatrogenic') {
    const cause =
      menopause_cause === 'chemotherapy'
        ? 'chemotherapy or radiation'
        : 'medical treatment';
    return `Self-reported: menopause caused by ${cause}`;
  }
  if (straw_stage === 'hysterectomy_ovaries_intact') {
    return 'Self-reported: hysterectomy with ovaries intact';
  }

  const statusNotes: Record<PeriodsStatus, string> = {
    regular: 'Self-reported: regular menstrual cycles',
    changing: '',
    stopped: 'Self-reported: periods have stopped',
  };

  if (periods_status === 'changing' && period_changes) {
    const changeNotes: Record<PeriodChanges, string> = {
      shorter: 'Self-reported: shorter cycle length',
      variable: 'Self-reported: variable cycle length with 7+ day differences',
      skipping: 'Self-reported: skipped periods (60+ days between cycles)',
    };
    return changeNotes[period_changes];
  }

  if (periods_status) {
    return statusNotes[periods_status];
  }

  return 'Self-reported during onboarding';
}

export function formatStrawStageDisplay(profile: Profile): string {
  const label = profile.straw_stage_label ?? 'Not specified';
  const code = profile.straw_stage;
  if (!code) return label;
  if (code === 'surgical' || code === 'iatrogenic' || code === 'hysterectomy_ovaries_intact') {
    return `${label} (${code.replace(/_/g, ' ')})`;
  }
  return `${label} (Stage ${code})`;
}

export function computeAdherence(
  checkinDates: string[],
  frequency: string | null | undefined,
  rangeStart: string,
  rangeEnd: string,
): { label: string; percent: number } {
  const uniqueInRange = new Set(
    checkinDates.filter((d) => d >= rangeStart && d <= rangeEnd),
  );
  const actual = uniqueInRange.size;

  const totalDays = Math.max(1, daysBetweenISO(rangeStart, rangeEnd) + 1);

  let expected: number;
  let freqLabel: string;

  switch (frequency) {
    case 'weekly':
      expected = Math.max(1, Math.ceil(totalDays / 7));
      freqLabel = 'Weekly check-ins';
      break;
    case 'monthly':
      expected = Math.max(1, Math.ceil(totalDays / 30));
      freqLabel = 'Monthly check-ins';
      break;
    default:
      expected = totalDays;
      freqLabel = 'Daily check-ins';
  }

  const percent = Math.min(100, Math.round((actual / expected) * 100));
  return { label: freqLabel, percent };
}

export function formatReportDateRange(start: string, end: string): string {
  return `${formatChartDateLong(start)} – ${formatChartDateLong(end)}`;
}

export function formatMenopauseCauseNote(profile: Profile): string | null {
  if (profile.straw_stage !== 'surgical' && profile.straw_stage !== 'iatrogenic') {
    return null;
  }
  const causeMap: Record<string, string> = {
    surgical: 'Bilateral oophorectomy',
    chemotherapy: 'Chemotherapy or radiation',
    radiation: 'Radiation therapy',
    hysterectomy: 'Hysterectomy',
    natural: 'Natural menopause',
    unknown: 'Cause not specified',
  };
  const cause = profile.menopause_cause ? causeMap[profile.menopause_cause] : null;
  return cause ? `Cause: ${cause}` : null;
}
