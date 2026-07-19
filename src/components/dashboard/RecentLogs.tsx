import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useQuickLog } from '../../hooks/useQuickLog';
import { getSymptomByKey, getSymptomChipLabel } from '../../data/symptoms';
import { formatRelativeTime, capitalize } from '../../utils/formatters';

/** Severity as depth of rose — same language as the heatmap (design rule 8). Severity is 1–10. */
function severityColor(severity: number): string {
  if (severity <= 2) return 'bg-[#e5aac8]';
  if (severity <= 4) return 'bg-[#c989a7]';
  if (severity <= 6) return 'bg-[#be739a]';
  if (severity <= 8) return 'bg-[#a64d79]';
  return 'bg-[#7a3b5e]';
}

const DURATION_LABELS: Record<number, string> = {
  5: 'A few minutes',
  22: '15–30 min',
  45: '30–60 min',
  90: '1+ hours',
};

export function RecentLogs() {
  const { events, isLoading, deleteEvent } = useQuickLog();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

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
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${severityColor(event.severity)}`}
                      aria-hidden
                    />
                    <span className="text-xs font-medium tabular-nums text-sage-600">
                      {event.severity}
                      <span className="sr-only"> of 10 severity</span>
                    </span>
                  </span>
                )}
                <span className="flex-1 truncate text-sage-800">
                  {getSymptomChipLabel(def) || event.symptom_id}
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
                  <div className="mt-2 border-t border-sand-200 pt-2">
                    {confirmingId === event.id ? (
                      <span className="flex items-center gap-3">
                        <span className="text-sage-600">Remove this entry?</span>
                        <button
                          type="button"
                          onClick={() => void deleteEvent(event.id)}
                          className="font-medium text-danger underline hover:opacity-80"
                        >
                          Remove
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="text-sage-500 underline hover:text-sage-700"
                        >
                          Keep it
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingId(event.id)}
                        className="text-sage-500 underline hover:text-sage-700"
                      >
                        Remove entry
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
