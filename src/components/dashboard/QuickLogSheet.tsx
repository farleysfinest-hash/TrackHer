import { useState, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useQuickLogStore } from '../../stores/quickLogStore';
import { useQuickLog } from '../../hooks/useQuickLog';
import { useSymptomSelections } from '../../hooks/useSymptomSelections';
import { useToast } from '../../stores/toastStore';
import { buildQuickLogEcho } from '../../utils/echoHelpers';
import { getSymptomByKey, searchSymptomCatalog } from '../../data/symptoms';
import { SYMPTOM_BODY_SYSTEM_LABELS } from '../../types/symptoms';
import type { QuickLogTriggerTag } from '../../types/database';
import { Button } from '../ui/Button';

const TRIGGER_TAGS: { id: QuickLogTriggerTag; label: string }[] = [
  { id: 'stress', label: 'Stress' },
  { id: 'food', label: 'Food' },
  { id: 'exercise', label: 'Exercise' },
  { id: 'heat', label: 'Heat' },
  { id: 'poor_sleep', label: 'Poor sleep' },
  { id: 'missed_dose', label: 'Missed dose' },
  { id: 'alcohol', label: 'Alcohol' },
  { id: 'caffeine', label: 'Caffeine' },
  { id: 'other', label: 'Other' },
];

const DURATION_OPTIONS: { label: string; minutes: number | null }[] = [
  { label: 'Still happening', minutes: null },
  { label: 'A few minutes', minutes: 5 },
  { label: '15–30 min', minutes: 22 },
  { label: '30–60 min', minutes: 45 },
  { label: '1+ hours', minutes: 90 },
];

const QUICK_SEVERITY_LABELS = [
  'Barely noticeable',
  '',
  '',
  '',
  '',
  'Moderate',
  '',
  '',
  '',
  '',
  'Worst ever',
];

type TimeOptionId = 'now' | '30min' | `hours_${number}`;

function buildTimeOptions(): { id: TimeOptionId; label: string; getIso: () => string }[] {
  const now = new Date();
  const options: { id: TimeOptionId; label: string; getIso: () => string }[] = [
    { id: 'now', label: 'Just now', getIso: () => new Date().toISOString() },
    {
      id: '30min',
      label: '30 min ago',
      getIso: () => new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
  ];
  for (let hours = 1; hours <= 12; hours++) {
    const past = new Date(now.getTime() - hours * 60 * 60 * 1000);
    if (past.toDateString() !== now.toDateString()) break;
    options.push({
      id: `hours_${hours}`,
      label: hours === 1 ? '1 hour ago' : `${hours} hours ago`,
      getIso: () => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
    });
  }
  return options;
}

const TIME_OPTIONS = buildTimeOptions();

function resolveLoggedAt(timeId: TimeOptionId): string {
  const opt = TIME_OPTIONS.find((o) => o.id === timeId);
  return opt ? opt.getIso() : new Date().toISOString();
}

export function QuickLogSheet() {
  const isOpen = useQuickLogStore((s) => s.isSheetOpen);
  const selectedSymptomId = useQuickLogStore((s) => s.selectedSymptomId);
  const closeSheet = useQuickLogStore((s) => s.closeSheet);
  const selectSymptom = useQuickLogStore((s) => s.selectSymptom);
  const { createEvent, events } = useQuickLog();
  const { watchSymptomIds, trackedSymptomIds } = useSymptomSelections();
  const toast = useToast();

  const [severity, setSeverity] = useState<number | null>(null);
  const [severityTouched, setSeverityTouched] = useState(false);
  const [selectedTimeId, setSelectedTimeId] = useState<TimeOptionId>('now');
  const [durationMinutes, setDurationMinutes] = useState<number | null | undefined>(undefined);
  const [triggerTag, setTriggerTag] = useState<QuickLogTriggerTag | null>(null);
  const [notes, setNotes] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const symptom = selectedSymptomId ? getSymptomByKey(selectedSymptomId) : null;
  const searchResults = useMemo(
    () => (searchQuery.trim() ? searchSymptomCatalog(searchQuery, 20) : []),
    [searchQuery],
  );

  const isOneOff =
    selectedSymptomId !== null && !trackedSymptomIds.includes(selectedSymptomId);

  const resetForm = useCallback(() => {
    setSeverity(null);
    setSeverityTouched(false);
    setSelectedTimeId('now');
    setDurationMinutes(undefined);
    setTriggerTag(null);
    setNotes('');
    setDetailOpen(false);
    setSearchOpen(false);
    setSearchQuery('');
  }, []);

  const handleClose = () => {
    resetForm();
    closeSheet();
  };

  const handleSave = async () => {
    if (!selectedSymptomId) return;
    setIsSaving(true);
    const result = await createEvent({
      symptom_id: selectedSymptomId,
      severity: severityTouched ? severity : null,
      logged_at: resolveLoggedAt(selectedTimeId),
      duration_minutes: durationMinutes === undefined ? null : durationMinutes,
      trigger_tag: triggerTag,
      notes: notes.trim() || null,
    });
    setIsSaving(false);
    if (result) {
      toast.success(buildQuickLogEcho(result, events));
      handleClose();
    } else {
      toast.error('Failed to log symptom');
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button, input, textarea, a')) return;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = e.changedTouches[0].clientY - touchStartY.current;
    if (delta > 80) handleClose();
    touchStartY.current = null;
  };

  const handleSelectSymptom = (id: string) => {
    selectSymptom(id);
    setSearchOpen(false);
    setSearchQuery('');
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px] animate-fade-in"
        onClick={handleClose}
        aria-label="Close"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal
        aria-labelledby="quick-log-title"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative z-10 flex w-full max-w-lg flex-col animate-slide-up rounded-t-2xl border border-sand-200 bg-white shadow-2xl sm:m-4 sm:rounded-2xl max-h-[min(90vh,640px)]"
      >
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-sand-300" />
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-sand-100 px-5 py-4">
          <h2 id="quick-log-title" className="font-display text-lg text-sage-800">
            {symptom ? symptom.label : 'Quick log'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-sage-400 hover:bg-sage-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {watchSymptomIds.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-sage-400">
                Watch symptoms
              </p>
              <div className="flex flex-wrap gap-2">
                {watchSymptomIds.map((id) => {
                  const def = getSymptomByKey(id);
                  if (!def) return null;
                  const isSelected = selectedSymptomId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleSelectSymptom(id)}
                      className={[
                        'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                        isSelected
                          ? 'border-sage-500 bg-sage-500 text-white'
                          : 'border-sage-200 bg-sage-50 text-sage-700 hover:border-sage-400',
                      ].join(' ')}
                    >
                      {def.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mb-4">
            {!searchOpen ? (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="text-sm text-sage-500 underline hover:text-sage-700"
              >
                Log something else…
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search all symptoms…"
                  autoFocus
                  className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm text-sage-800 placeholder:text-sage-400 focus:border-sage-400 focus:outline-none focus:ring-1 focus:ring-sage-400"
                />
                {searchQuery.trim() && (
                  <div className="max-h-52 overflow-y-auto rounded-lg border border-sand-200">
                    {searchResults.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-sage-400">No symptoms match.</p>
                    ) : (
                      <ul>
                        {searchResults.map((s) => (
                          <li key={s.key}>
                            <button
                              type="button"
                              onClick={() => handleSelectSymptom(s.key)}
                              className={[
                                'flex w-full flex-col items-start px-3 py-2.5 text-left text-sm hover:bg-sand-50',
                                selectedSymptomId === s.key ? 'bg-sage-50' : '',
                              ].join(' ')}
                            >
                              <span className="font-medium text-sage-800">{s.label}</span>
                              <span className="text-xs text-sage-400">
                                {SYMPTOM_BODY_SYSTEM_LABELS[s.bodySystem]}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-sand-100 pt-4">
            <button
              type="button"
              onClick={() => setDetailOpen((v) => !v)}
              className="flex w-full items-center justify-between text-sm font-medium text-sage-700"
            >
              <span>Add detail</span>
              {detailOpen ? (
                <ChevronUp className="h-4 w-4 text-sage-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-sage-400" />
              )}
            </button>

            {detailOpen && (
              <div className="mt-4 space-y-5">
                <div>
                  <label className="text-sm font-medium text-sage-700">
                    Severity{severityTouched && severity !== null ? `: ${severity}/10` : ''}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={severity ?? 5}
                    onChange={(e) => {
                      setSeverityTouched(true);
                      setSeverity(Number(e.target.value));
                    }}
                    className="mt-2 w-full accent-sage-500"
                  />
                  <div className="mt-1 flex justify-between text-xs text-sage-400">
                    <span>{QUICK_SEVERITY_LABELS[0]}</span>
                    <span>{QUICK_SEVERITY_LABELS[5]}</span>
                    <span>{QUICK_SEVERITY_LABELS[10]}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-sage-700">When did this happen?</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {TIME_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedTimeId(opt.id)}
                        className={[
                          'rounded-full border px-3 py-1.5 text-xs font-medium',
                          selectedTimeId === opt.id
                            ? 'border-sage-500 bg-sage-50 text-sage-700'
                            : 'border-sand-200 text-sage-600 hover:border-sage-300',
                        ].join(' ')}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-sage-700">
                    How long did it last?{' '}
                    <span className="font-normal text-sage-400">(optional)</span>
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DURATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setDurationMinutes(opt.minutes)}
                        className={[
                          'rounded-full border px-3 py-1.5 text-xs font-medium',
                          durationMinutes === opt.minutes
                            ? 'border-sage-500 bg-sage-50 text-sage-700'
                            : 'border-sand-200 text-sage-600 hover:border-sage-300',
                        ].join(' ')}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-sage-700">
                    Any trigger? <span className="font-normal text-sage-400">(optional)</span>
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {TRIGGER_TAGS.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => setTriggerTag(triggerTag === tag.id ? null : tag.id)}
                        className={[
                          'rounded-full border px-3 py-1.5 text-xs font-medium',
                          triggerTag === tag.id
                            ? 'border-sage-500 bg-sage-50 text-sage-700'
                            : 'border-sand-200 text-sage-600 hover:border-sage-300',
                        ].join(' ')}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="quick-log-notes" className="text-sm font-medium text-sage-700">
                    Notes <span className="font-normal text-sage-400">(optional)</span>
                  </label>
                  <textarea
                    id="quick-log-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Anything else to note..."
                    className="mt-2 w-full rounded-lg border border-sand-200 px-3 py-2 text-sm text-sage-800 placeholder:text-sage-400 focus:border-sage-400 focus:outline-none focus:ring-1 focus:ring-sage-400"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-sand-100 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {isOneOff && (
            <p className="mb-3 text-xs text-sage-400">
              Logged as a one-off. You can add it to your tracked symptoms in check-in settings.
            </p>
          )}
          <Button
            onClick={handleSave}
            isLoading={isSaving}
            loadingText="Logging..."
            disabled={!selectedSymptomId}
            className="w-full"
          >
            Log it
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
