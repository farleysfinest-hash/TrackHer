import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useLabEntryStore } from '../../stores/labEntryStore';
import { useLabResults } from '../../hooks/useLabResults';
import { useToast } from '../../stores/toastStore';
import { getBiomarkersByCategory } from '../../data/labRanges';
import { LAB_CATEGORIES } from '../../utils/labHelpers';
import { LabPanelSection } from './LabPanelSection';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { todayISO } from '../../utils/localDate';

interface LabEntryFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function LabEntryForm({ onClose, onSuccess }: LabEntryFormProps) {
  const {
    isEditing,
    editingLabId,
    drawDate,
    fasting,
    drawTime,
    labName,
    values,
    notes,
    setValue,
    setDrawDate,
    setFasting,
    setDrawTime,
    setLabName,
    setNotes,
    getFilledCount,
    reset,
  } = useLabEntryStore();

  const { labResults, createLabResult, updateLabResult, getPreviousValue } = useLabResults();
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState('');

  const previousValues = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const cat of LAB_CATEGORIES) {
      for (const b of getBiomarkersByCategory(cat.key)) {
        map[b.key] = isEditing
          ? getPreviousValue(b.key, drawDate)
          : getPreviousValue(b.key, drawDate);
      }
    }
    return map;
  }, [drawDate, isEditing, getPreviousValue, labResults]);

  const handleSave = async () => {
    setValidationError('');
    if (getFilledCount() < 1) {
      setValidationError('Enter at least one biomarker value to save.');
      return;
    }

    setIsSaving(true);
    const payload = {
      drawDate,
      fasting,
      drawTime,
      labName,
      values,
      notes,
    };

    let ok = false;
    if (isEditing && editingLabId) {
      ok = await updateLabResult(editingLabId, payload);
    } else {
      const result = await createLabResult(payload);
      ok = !!result;
    }

    setIsSaving(false);
    if (ok) {
      toast.success(isEditing ? 'Lab results updated' : 'Lab results saved');
      reset();
      onSuccess();
    } else {
      toast.error('Failed to save lab results');
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-sand-50"
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? 'Edit lab results' : 'Add lab results'}
    >
      <header className="safe-area-top flex items-center justify-between border-b border-sand-200 bg-white px-6 pb-4">
        <h1 className="font-display text-xl text-sage-800">
          {isEditing ? 'Edit Lab Results' : 'Add Lab Results'}
        </h1>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg p-2 text-sage-400 hover:bg-sage-50"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="safe-area-bottom flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-[640px] space-y-8">
          <div className="rounded-xl border border-sand-200 bg-white p-6 space-y-4">
            <div>
              <label htmlFor="draw-date" className="mb-1 block text-sm font-medium text-sage-700">
                Date drawn
              </label>
              <input
                id="draw-date"
                type="date"
                value={drawDate}
                onChange={(e) => setDrawDate(e.target.value)}
                className="w-full rounded-lg border border-sand-200 px-3 py-2.5 text-sage-800"
                required
                max={todayISO()}
              />
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium text-sage-700">Fasting?</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-sage-600">
                  <input
                    type="radio"
                    name="fasting"
                    checked={fasting === true}
                    onChange={() => setFasting(true)}
                  />
                  Yes
                </label>
                <label className="flex items-center gap-2 text-sm text-sage-600">
                  <input
                    type="radio"
                    name="fasting"
                    checked={fasting === false}
                    onChange={() => setFasting(false)}
                  />
                  No
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="draw-time" className="mb-1 block text-sm font-medium text-sage-700">
                Time of draw <span className="text-sage-400">(optional)</span>
              </label>
              <input
                id="draw-time"
                type="time"
                value={drawTime ?? ''}
                onChange={(e) => setDrawTime(e.target.value || null)}
                className="w-full rounded-lg border border-sand-200 px-3 py-2.5 text-sage-800"
              />
            </div>

            <Input
              label="Lab name (optional)"
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              placeholder="Quest Diagnostics"
            />

            <p className="text-sm text-sage-500">
              Fill in the values from your lab report. You don&apos;t need to enter everything —
              just what you have.
            </p>
          </div>

          <div className="space-y-4">
            {LAB_CATEGORIES.map((cat, i) => (
              <LabPanelSection
                key={cat.key}
                label={cat.label}
                biomarkers={getBiomarkersByCategory(cat.key)}
                values={values}
                previousValues={previousValues}
                defaultExpanded={i === 0}
                onChange={setValue}
              />
            ))}
          </div>

          <div className="rounded-xl border border-sand-200 bg-white p-6">
            <label htmlFor="lab-notes" className="mb-2 block text-sm font-medium text-sage-700">
              Notes (optional)
            </label>
            <textarea
              id="lab-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={'e.g., "Drawn 2 hours after morning dose" or "Fasted 12 hours"'}
              className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sage-800 placeholder:text-sage-400"
            />
          </div>

          {validationError && (
            <p className="text-sm text-danger">{validationError}</p>
          )}

          <div className="flex gap-3 pb-8">
            <Button variant="secondary" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button
              isLoading={isSaving}
              loadingText="Saving..."
              onClick={() => void handleSave()}
              className="flex-1"
            >
              Save Lab Results
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
