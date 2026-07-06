import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useQuickLogStore } from '../../stores/quickLogStore';
import { useQuickLog } from '../../hooks/useQuickLog';
import { useToast } from '../../stores/toastStore';
import { getSymptomByKey } from '../../data/symptoms';
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

function getTodayTimeOptions(): { label: string; iso: string }[] {
  const now = new Date();
  const options: { label: string; iso: string }[] = [
    { label: 'Right now', iso: now.toISOString() },
  ];
  for (let h = 1; h <= 12; h++) {
    const past = new Date(now.getTime() - h * 60 * 60 * 1000);
    if (past.toDateString() !== now.toDateString()) break;
    options.push({
      label: `${h} hour${h === 1 ? '' : 's'} ago`,
      iso: past.toISOString(),
    });
  }
  return options;
}

export function QuickLogSheet() {
  const isOpen = useQuickLogStore((s) => s.isSheetOpen);
  const selectedSymptomId = useQuickLogStore((s) => s.selectedSymptomId);
  const closeSheet = useQuickLogStore((s) => s.closeSheet);
  const { createEvent } = useQuickLog();
  const toast = useToast();

  const [severity, setSeverity] = useState(5);
  const [loggedAt, setLoggedAt] = useState(() => new Date().toISOString());
  const [durationMinutes, setDurationMinutes] = useState<number | null | undefined>(undefined);
  const [triggerTag, setTriggerTag] = useState<QuickLogTriggerTag | null>(null);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const symptom = selectedSymptomId ? getSymptomByKey(selectedSymptomId) : null;
  const timeOptions = getTodayTimeOptions();

  const resetForm = useCallback(() => {
    setSeverity(5);
    setLoggedAt(new Date().toISOString());
    setDurationMinutes(undefined);
    setTriggerTag(null);
    setNotes('');
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
      severity,
      logged_at: loggedAt,
      duration_minutes: durationMinutes === undefined ? null : durationMinutes,
      trigger_tag: triggerTag,
      notes: notes.trim() || null,
    });
    setIsSaving(false);
    if (result) {
      toast.success('Symptom logged');
      handleClose();
    } else {
      toast.error('Failed to log symptom');
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = e.changedTouches[0].clientY - touchStartY.current;
    if (delta > 80) handleClose();
    touchStartY.current = null;
  };

  if (!isOpen || !symptom) return null;

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
        className="relative z-10 w-full max-w-lg animate-slide-up rounded-t-2xl border border-sand-200 bg-white shadow-2xl sm:rounded-2xl sm:m-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-sand-300" />
        </div>

        <div className="flex items-center justify-between border-b border-sand-100 px-5 py-4">
          <h2 id="quick-log-title" className="font-display text-lg text-sage-800">
            {symptom.label}
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

        <div className="space-y-5 px-5 py-5">
          <div>
            <label className="text-sm font-medium text-sage-700">
              Severity: {severity}/10
            </label>
            <input
              type="range"
              min={0}
              max={10}
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value))}
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
              {timeOptions.map((opt) => (
                <button
                  key={opt.iso}
                  type="button"
                  onClick={() => setLoggedAt(opt.iso)}
                  className={[
                    'rounded-full border px-3 py-1.5 text-xs font-medium',
                    loggedAt === opt.iso
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
              How long did it last? <span className="font-normal text-sage-400">(optional)</span>
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

          <Button
            onClick={handleSave}
            isLoading={isSaving}
            loadingText="Logging..."
            className="w-full"
          >
            Log
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
