import { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { getLocalDateISO, getResolvedTimezone } from '../../utils/checkinHelpers';
import { ProviderReportButton } from './ProviderReportButton';
import { Card } from '../ui/Card';
import { daysBetweenISO } from '../../utils/localDate';

function daysBetween(from: string, to: string): number {
  return daysBetweenISO(from, to);
}

interface AppointmentCountdownCardProps {
  earliestCheckinDate: string | null;
}

export function AppointmentCountdownCard({ earliestCheckinDate }: AppointmentCountdownCardProps) {
  const appointmentDate = useAuthStore((s) => s.profile?.next_appointment_date);
  const timezone = getResolvedTimezone(useAuthStore((s) => s.profile?.timezone));
  const today = getLocalDateISO(timezone);

  const content = useMemo(() => {
    if (!appointmentDate || appointmentDate < today) return null;

    const daysUntil = daysBetween(today, appointmentDate);
    const heading =
      daysUntil === 0
        ? 'Your appointment is today'
        : `Your appointment is in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;

    const trackingText = earliestCheckinDate
      ? `${Math.max(1, Math.ceil(daysBetween(earliestCheckinDate, appointmentDate) / 7))} weeks of tracking`
      : 'your tracking so far';

    return { heading, trackingText, showReport: daysUntil <= 7 };
  }, [appointmentDate, earliestCheckinDate, today]);

  if (!content) return null;

  return (
    <Card variant="elevated" className="border-l-4 border-l-sage-400">
      <div className="flex items-start gap-3">
        <Calendar className="mt-0.5 h-6 w-6 shrink-0 text-sage-500" />
        <div className="flex-1 space-y-2">
          <h2 className="font-display text-lg text-sage-800">{content.heading}</h2>
          <p className="text-sm text-sage-600">
            Your provider report will cover {content.trackingText} by then.
          </p>
          {content.showReport && (
            <div className="pt-2">
              <ProviderReportButton compact />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
