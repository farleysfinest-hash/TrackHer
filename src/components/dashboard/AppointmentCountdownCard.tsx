import { Calendar } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { getLocalDateISO, getResolvedTimezone } from '../../utils/checkinHelpers';
import { daysBetweenISO } from '../../utils/localDate';

interface AppointmentCountdownCardProps {
  /** Kept for call-site compatibility; chip no longer uses tracking history. */
  earliestCheckinDate: string | null;
}

export function AppointmentCountdownCard({
  earliestCheckinDate: _earliestCheckinDate,
}: AppointmentCountdownCardProps) {
  const appointmentDate = useAuthStore((s) => s.profile?.next_appointment_date);
  const timezone = getResolvedTimezone(useAuthStore((s) => s.profile?.timezone));
  const today = getLocalDateISO(timezone);

  if (!appointmentDate || appointmentDate < today) return null;

  const daysUntil = daysBetweenISO(today, appointmentDate);
  const label =
    daysUntil === 0
      ? 'Appointment today'
      : `Appointment in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-sand-200 bg-sand-50 px-3 py-1.5 text-sm text-sage-600">
      <Calendar className="h-4 w-4 shrink-0 text-sage-500" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
