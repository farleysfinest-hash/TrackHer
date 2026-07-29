import { useEffect, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { useJournalExtract } from '../../hooks/useJournalExtract';
import { useQuickLog } from '../../hooks/useQuickLog';
import { useMedications } from '../../hooks/useMedications';
import { useToast } from '../../stores/toastStore';
import { getLocalDateISO, getResolvedTimezone } from '../../utils/checkinHelpers';
import { useAuthStore } from '../../stores/authStore';
import type {
  JournalEventSuggestion,
  JournalSymptomSuggestion,
} from '../../utils/aiJournalExtract';
import { tapLight } from '../../lib/haptics';

/**
 * Secondary Quick Log mode: free text → confirm chips → store writes.
 * Nothing is persisted until she taps confirm on each item.
 */
export function JournalQuickEntry() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [confirmedKeys, setConfirmedKeys] = useState<Set<string>>(new Set());
  const [confirmedEvents, setConfirmedEvents] = useState<Set<number>>(new Set());
  const { extract, result, isLoading, error, clear } = useJournalExtract();
  const { createEvent } = useQuickLog();
  const { medications, updateMedication, fetchActiveMedications } = useMedications();
  const toast = useToast();
  const timezone = getResolvedTimezone(useAuthStore((s) => s.profile?.timezone));

  useEffect(() => {
    if (open) void fetchActiveMedications();
  }, [open, fetchActiveMedications]);

  const activeMeds = medications.filter((m) => m.is_active && !m.end_date);
  const medNames = activeMeds.map((m) => m.name);

  const reset = () => {
    setText('');
    clear();
    setConfirmedKeys(new Set());
    setConfirmedEvents(new Set());
  };

  const onExtract = async () => {
    setConfirmedKeys(new Set());
    setConfirmedEvents(new Set());
    await extract(text, medNames);
  };

  const confirmSymptom = async (s: JournalSymptomSuggestion) => {
    if (confirmedKeys.has(s.key)) return;
    const created = await createEvent({
      symptom_id: s.key,
      severity: null,
      logged_at: new Date().toISOString(),
      duration_minutes: null,
      trigger_tag: null,
      notes: s.reason.trim() || null,
    });
    if (!created) {
      toast.error('Could not save that symptom');
      return;
    }
    void tapLight();
    setConfirmedKeys((prev) => new Set(prev).add(s.key));
    toast.success(`Logged ${s.label}`);
  };

  const confirmEvent = async (e: JournalEventSuggestion, index: number) => {
    if (confirmedEvents.has(index)) return;
    const today = getLocalDateISO(timezone);
    const med =
      e.medicationName != null
        ? activeMeds.find((m) => m.name === e.medicationName)
        : activeMeds.length === 1
          ? activeMeds[0]
          : null;

    if (e.type === 'missed_dose' || e.type === 'note') {
      if (!med) {
        toast.error(
          e.medicationName
            ? `Couldn’t match “${e.medicationName}” to a medication`
            : 'Pick which medication this note belongs to in Medications first',
        );
        return;
      }
      const line =
        e.type === 'missed_dose'
          ? `${today}: Missed dose — ${e.note}`
          : `${today}: ${e.note}`;
      const nextNotes = med.notes?.trim() ? `${med.notes.trim()}\n${line}` : line;
      const ok = await updateMedication(med.id, { notes: nextNotes });
      if (!ok) {
        toast.error('Could not save that note');
        return;
      }
      void tapLight();
      setConfirmedEvents((prev) => new Set(prev).add(index));
      toast.success(e.type === 'missed_dose' ? 'Noted missed dose' : 'Saved note');
    }
  };

  if (!open) {
    return (
      <div className="mb-4 border-t border-sand-100 pt-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm text-sage-500 underline hover:text-sage-700"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Or tell me about today…
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-3 rounded-xl border border-sage-200 bg-sage-50/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-sage-500">
            Journal
          </p>
          <p className="mt-0.5 text-sm text-sage-700">
            Tell me about today, any way you like — then confirm what to log.
          </p>
        </div>
        <button
          type="button"
          className="text-xs text-sage-500 underline hover:text-sage-700"
          onClick={() => {
            setOpen(false);
            reset();
          }}
        >
          Close
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="e.g. rough sleep, forgot my evening progesterone, hot flashes after lunch…"
        className="w-full rounded-lg border border-sand-200 bg-sand-50 px-3 py-2 text-base text-sage-800 placeholder:text-sage-400 focus:border-sage-400 focus:outline-none focus:ring-1 focus:ring-sage-400"
      />

      <Button
        type="button"
        variant="secondary"
        size="sm"
        isLoading={isLoading}
        loadingText="Reading…"
        disabled={!text.trim() || isLoading}
        onClick={() => void onExtract()}
      >
        Suggest what to log
      </Button>

      {error && <p className="text-sm text-sage-600">{error}</p>}

      {result && (result.symptoms.length > 0 || result.events.length > 0) && (
        <div className="space-y-3">
          {result.symptoms.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-sage-500">
                Symptoms
              </p>
              <div className="flex flex-wrap gap-2">
                {result.symptoms.map((s) => {
                  const done = confirmedKeys.has(s.key);
                  return (
                    <button
                      key={s.key}
                      type="button"
                      disabled={done}
                      onClick={() => void confirmSymptom(s)}
                      className={[
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                        done
                          ? 'border-sage-300 bg-sage-100 text-sage-500'
                          : 'border-sage-400 bg-sand-50 text-sage-800 hover:bg-sage-50',
                      ].join(' ')}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : null}
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {result.events.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-sage-500">
                Notes
              </p>
              <div className="flex flex-col gap-2">
                {result.events.map((e, i) => {
                  const done = confirmedEvents.has(i);
                  const label =
                    e.type === 'missed_dose'
                      ? `Missed dose${e.medicationName ? ` — ${e.medicationName}` : ''}`
                      : e.note.slice(0, 80);
                  return (
                    <button
                      key={`${e.type}-${i}`}
                      type="button"
                      disabled={done}
                      onClick={() => void confirmEvent(e, i)}
                      className={[
                        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                        done
                          ? 'border-sage-300 bg-sage-100 text-sage-500'
                          : 'border-sage-400 bg-sand-50 text-sage-800 hover:bg-sage-50',
                      ].join(' ')}
                    >
                      {done ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                      <span className="min-w-0">
                        <span className="font-medium">{label}</span>
                        {e.type === 'missed_dose' && e.note ? (
                          <span className="mt-0.5 block text-xs text-sage-500">{e.note}</span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
