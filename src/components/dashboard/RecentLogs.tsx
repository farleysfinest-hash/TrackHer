import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useQuickLog } from '../../hooks/useQuickLog';
import { getSymptomByKey } from '../../data/symptoms';
import { formatRelativeTime, capitalize } from '../../utils/formatters';

function severityColor(severity: number): string {
  if (severity <= 3) return 'bg-success';
  if (severity <= 6) return 'bg-amber-500';
  if (severity <= 8) return 'bg-orange-500';
  return 'bg-red-500';
}

const DURATION_LABELS: Record<number, string> = {
  5: 'A few minutes',
  22: '15–30 min',
  45: '30–60 min',
  90: '1+ hours',
};

export function RecentLogs() {
  const { events, isLoading } = useQuickLog();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const recent = events.slice(0, 7);

  if (isLoading || recent.length === 0) return null;

  return (
    <div className="mt-5 border-t border-sand-100 pt-4">
      <h3 className="text-sm font-medium text-sage-600">Recent logs</h3>
      <ul className="mt-2 space-y-1">
        {recent.map((event) => {
          const def = getSymptomByKey(event.symptom_id);
          const isExpanded = expandedId === event.id;
          return (
            <li key={event.id}>
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : event.id)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-sand-50"
              >
                {event.severity !== null && (
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${severityColor(event.severity)}`}
                    aria-hidden
                  />
                )}
                <span className="flex-1 truncate text-sage-800">
                  {def?.label ?? event.symptom_id}
                </span>
                {event.trigger_tag && (
                  <span className="hidden text-xs text-sage-400 sm:inline">
                    {capitalize(event.trigger_tag.replace(/_/g, ' '))}
                  </span>
                )}
                <span className="shrink-0 text-xs text-sage-400">
                  {formatRelativeTime(event.logged_at)}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-sage-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-sage-400" />
                )}
              </button>
              {isExpanded && (
                <div className="ml-7 mr-2 mb-2 rounded-lg bg-sand-50 px-3 py-2 text-xs text-sage-600">
                  {event.severity !== null && <p>Severity: {event.severity}/10</p>}
                  {event.duration_minutes != null && (
                    <p>
                      Duration:{' '}
                      {DURATION_LABELS[event.duration_minutes] ??
                        `${event.duration_minutes} min`}
                    </p>
                  )}
                  {event.duration_minutes === null && event.duration_minutes !== undefined && (
                    <p>Duration: Still happening</p>
                  )}
                  {event.trigger_tag && (
                    <p>Trigger: {capitalize(event.trigger_tag.replace(/_/g, ' '))}</p>
                  )}
                  {event.notes && <p className="mt-1 italic">&ldquo;{event.notes}&rdquo;</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
