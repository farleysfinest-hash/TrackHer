import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useJournalExtract } from '../../hooks/useJournalExtract';
import { useQuickLog } from '../../hooks/useQuickLog';
import { useMedications } from '../../hooks/useMedications';
import { useToast } from '../../stores/toastStore';
import { useAuthStore } from '../../stores/authStore';
import { getLocalDateISO, getResolvedTimezone } from '../../utils/checkinHelpers';
import type {
  JournalEventSuggestion,
  JournalSymptomSuggestion,
} from '../../utils/aiJournalExtract';
import { tapLight } from '../../lib/haptics';
import { Button } from '../ui/Button';
import { CompanionRiskNotice } from '../insights/CompanionRiskNotice';

interface LunaCaptureReviewProps {
  text: string;
}

export function LunaCaptureReview({ text }: LunaCaptureReviewProps) {
  const [open, setOpen] = useState(false);
  const [confirmedKeys, setConfirmedKeys] = useState<Set<string>>(new Set());
  const [confirmedEvents, setConfirmedEvents] = useState<Set<number>>(new Set());
  const { extract, result, isLoading, error, clear } = useJournalExtract();
  const { createEvent } = useQuickLog();
  const { medications, updateMedication, fetchActiveMedications } = useMedications();
  const toast = useToast();
  const timezone = getResolvedTimezone(useAuthStore((state) => state.profile?.timezone));

  useEffect(() => {
    if (open) void fetchActiveMedications();
  }, [fetchActiveMedications, open]);

  const activeMeds = medications.filter((medication) => medication.is_active && !medication.end_date);
  const medicationNames = activeMeds.map((medication) => medication.medication_name);

  const startReview = async () => {
    setOpen(true);
    setConfirmedKeys(new Set());
    setConfirmedEvents(new Set());
    clear();
    await extract(text, medicationNames);
  };

  const confirmSymptom = async (suggestion: JournalSymptomSuggestion) => {
    if (confirmedKeys.has(suggestion.key)) return;
    const created = await createEvent({
      symptom_id: suggestion.key,
      severity: null,
      logged_at: new Date().toISOString(),
      duration_minutes: null,
      trigger_tag: null,
      notes: suggestion.reason.trim() || null,
    });
    if (!created) {
      toast.error('Could not save that symptom');
      return;
    }
    void tapLight();
    setConfirmedKeys((current) => new Set(current).add(suggestion.key));
    toast.success(`Logged ${suggestion.label}`);
  };

  const confirmEvent = async (event: JournalEventSuggestion, index: number) => {
    if (confirmedEvents.has(index)) return;
    const medication =
      event.medicationName != null
        ? activeMeds.find((item) => item.medication_name === event.medicationName)
        : activeMeds.length === 1
          ? activeMeds[0]
          : null;
    if (!medication) {
      toast.error(
        event.medicationName
          ? `Couldn’t match “${event.medicationName}” to a medication`
          : 'Choose the medication in Medications before saving this note',
      );
      return;
    }
    const today = getLocalDateISO(timezone);
    const line =
      event.type === 'missed_dose'
        ? `${today}: Missed dose — ${event.note}`
        : `${today}: ${event.note}`;
    const nextNotes = medication.notes?.trim()
      ? `${medication.notes.trim()}\n${line}`
      : line;
    const saved = await updateMedication(medication.id, { notes: nextNotes });
    if (!saved) {
      toast.error('Could not save that medication note');
      return;
    }
    void tapLight();
    setConfirmedEvents((current) => new Set(current).add(index));
    toast.success(event.type === 'missed_dose' ? 'Noted missed dose' : 'Saved note');
  };

  if (!open) {
    return (
      <button
        type="button"
        className="mt-1 text-xs text-sage-400 underline-offset-2 hover:underline"
        onClick={() => void startReview()}
      >
        Review what Luna could add
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-sage-200 bg-sage-50/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-sage-500">
            Review before saving
          </p>
          <p className="mt-1 text-xs leading-relaxed text-sage-600">
            Choose only the items you want added to TrackHer.
          </p>
        </div>
        <button
          type="button"
          className="text-xs text-sage-500 underline"
          onClick={() => {
            setOpen(false);
            clear();
          }}
        >
          Close
        </button>
      </div>

      {isLoading && <p className="mt-3 text-sm text-sage-500">Luna is organizing that…</p>}
      {error && <p className="mt-3 text-sm text-sage-600">{error}</p>}
      {result?.riskReply ? (
        <div className="mt-3">
          <CompanionRiskNotice reply={result.riskReply} />
        </div>
      ) : null}

      {result?.followUpQuestions.map((question) => (
        <p key={question} className="mt-3 rounded-lg bg-sand-50 px-3 py-2 text-sm text-sage-700">
          {question}
        </p>
      ))}

      {result && !result.riskReply && (
        <div className="mt-3 space-y-3">
          {result.symptoms.length > 0 && (
            <div>
              <p className="text-xs font-medium text-sage-500">Possible symptoms</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.symptoms.map((suggestion) => {
                  const confirmed = confirmedKeys.has(suggestion.key);
                  return (
                    <button
                      key={suggestion.key}
                      type="button"
                      disabled={confirmed}
                      onClick={() => void confirmSymptom(suggestion)}
                      className={[
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm',
                        confirmed
                          ? 'border-sage-300 bg-sage-100 text-sage-500'
                          : 'border-sage-400 bg-sand-50 text-sage-800',
                      ].join(' ')}
                    >
                      {confirmed && <Check className="h-3.5 w-3.5" />}
                      {suggestion.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {result.events.length > 0 && (
            <div>
              <p className="text-xs font-medium text-sage-500">Possible medication notes</p>
              <div className="mt-2 space-y-2">
                {result.events.map((event, index) => {
                  const confirmed = confirmedEvents.has(index);
                  return (
                    <button
                      key={`${event.type}-${index}`}
                      type="button"
                      disabled={confirmed}
                      onClick={() => void confirmEvent(event, index)}
                      className={[
                        'flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm',
                        confirmed
                          ? 'border-sage-300 bg-sage-100 text-sage-500'
                          : 'border-sage-400 bg-sand-50 text-sage-800',
                      ].join(' ')}
                    >
                      {confirmed && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                      <span>
                        {event.type === 'missed_dose'
                          ? `Missed dose${event.medicationName ? ` — ${event.medicationName}` : ''}`
                          : event.note}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {result.symptoms.length === 0 &&
            result.events.length === 0 &&
            result.followUpQuestions.length === 0 && (
              <p className="text-sm text-sage-500">Nothing clear is ready to add yet.</p>
            )}
        </div>
      )}

      {!isLoading && !result && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => void startReview()}>
          Try again
        </Button>
      )}
    </div>
  );
}
