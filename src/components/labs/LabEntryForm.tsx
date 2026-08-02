import { useMemo, useRef, useState } from 'react';
import { ExternalLink, Moon, Trash2, X } from 'lucide-react';
import { useLabEntryStore } from '../../stores/labEntryStore';
import { useLabResults } from '../../hooks/useLabResults';
import { useToast } from '../../stores/toastStore';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useTabActive } from '../layout/TabActiveContext';
import { getBiomarkerByKey, getBiomarkersByCategory, LAB_BIOMARKERS } from '../../data/labRanges';
import { LAB_CATEGORIES } from '../../utils/labHelpers';
import { LabPanelSection } from './LabPanelSection';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { todayISO } from '../../utils/localDate';
import { reportedValuesRecord } from '../../utils/labReportExtraction';

interface LabEntryFormProps {
  onClose: () => void;
  onSuccess: (confirmedMedicationMentions?: string[]) => void;
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
    sourceType,
    importedValues,
    medicationMentions,
    medicationAnswers,
    importWarnings,
    importPreviewDataUrl,
    importReviewedAt,
    setValue,
    setDrawDate,
    setFasting,
    setDrawTime,
    setLabName,
    setNotes,
    setImportedValue,
    removeImportedValue,
    setMedicationAnswer,
    getFilledCount,
    reset,
  } = useLabEntryStore();

  const { createLabResult, updateLabResult, getPreviousValue } = useLabResults();
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
  }, [drawDate, isEditing, getPreviousValue]);
  const hasHrtImport = importedValues.some((item) =>
    item.biomarkerKey === 'estradiol' ||
    item.biomarkerKey === 'estrone' ||
    item.biomarkerKey === 'progesterone' ||
    item.biomarkerKey === 'fsh' ||
    item.biomarkerKey === 'lh' ||
    item.biomarkerKey === 'total_testosterone' ||
    item.biomarkerKey === 'free_testosterone',
  );

  const handleSave = async () => {
    setValidationError('');
    if (getFilledCount() < 1) {
      setValidationError('Enter at least one biomarker value to save.');
      return;
    }
    if (medicationMentions.some((name) => !medicationAnswers[name])) {
      setValidationError('Please answer Luna’s medication question before saving. “I’m not sure” is okay.');
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
      ...(sourceType !== 'manual'
        ? {
            reportedValues: reportedValuesRecord(
              importedValues.map((item) => ({
                ...item,
                normalizedValue: item.biomarkerKey
                  ? values[item.biomarkerKey] ?? item.normalizedValue
                  : null,
              })),
            ),
            sourceType,
            importReviewedAt: importReviewedAt ?? new Date().toISOString(),
          }
        : {}),
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
      onSuccess(
        medicationMentions.filter((name) => medicationAnswers[name] === 'yes'),
      );
    } else {
      toast.error('Failed to save lab results');
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const dialogRef = useRef<HTMLDivElement>(null);
  const tabActive = useTabActive();
  useFocusTrap(tabActive, dialogRef, handleClose);

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-sand-50 outline-none"
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? 'Edit lab results' : 'Add lab results'}
    >
      <header className="safe-area-top flex items-center justify-between border-b border-sand-200 bg-sand-50 px-6 pb-4">
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
          {sourceType !== 'manual' && (
            <section aria-labelledby="luna-import-review" className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-sage-200 bg-sage-50/50 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-600">
                  <Moon className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <h2 id="luna-import-review" className="font-display text-lg text-sage-800">
                    Check what I read
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-sage-600">
                    I prepared a draft, but scans can misread digits and units. Compare every row with your report. Nothing is saved until you confirm below.
                  </p>
                </div>
              </div>

              {importPreviewDataUrl && (
                <div className="overflow-hidden rounded-xl border border-sand-200 bg-sand-100">
                  <img
                    src={importPreviewDataUrl}
                    alt="Laboratory report being reviewed"
                    className="max-h-80 w-full object-contain"
                  />
                </div>
              )}

              {importWarnings.map((warning) => (
                <p key={warning} className="rounded-lg bg-sand-100 px-3 py-2 text-sm text-sage-600">
                  {warning}
                </p>
              ))}

              <div className="space-y-3">
                {importedValues.map((item, index) => {
                  const biomarker = item.biomarkerKey
                    ? getBiomarkerByKey(item.biomarkerKey)
                    : undefined;
                  return (
                    <div
                      key={`${item.reportedLabel}-${index}`}
                      className={`rounded-xl border p-4 ${item.confidence < 0.8 ? 'border-sand-400 bg-sand-100/60' : 'border-sand-200 bg-sand-50'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-sage-500">
                          {item.confidence < 0.8 ? 'Please check carefully' : 'Extracted result'}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeImportedValue(index)}
                          className="rounded-lg p-1.5 text-sage-400 hover:bg-sage-50 hover:text-sage-600"
                          aria-label={`Remove ${item.reportedLabel}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <Input
                          label="Report label"
                          value={item.reportedLabel}
                          onChange={(event) => setImportedValue(index, { reportedLabel: event.target.value })}
                        />
                        <label className="block text-sm font-medium text-sage-700">
                          TrackHer match
                          <select
                            value={item.biomarkerKey ?? ''}
                            onChange={(event) => setImportedValue(index, { biomarkerKey: event.target.value || null })}
                            className="mt-1.5 w-full rounded-lg border border-sand-200 bg-sand-50 px-3 py-3 text-base text-sage-800"
                          >
                            <option value="">Keep as an uncharted result</option>
                            {LAB_BIOMARKERS.map((option) => (
                              <option key={option.key} value={option.key}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        <Input
                          label="Reported value"
                          value={item.reportedValue}
                          onChange={(event) => setImportedValue(index, { reportedValue: event.target.value })}
                        />
                        <Input
                          label="Reported unit"
                          value={item.reportedUnit ?? ''}
                          onChange={(event) => setImportedValue(index, { reportedUnit: event.target.value || null })}
                        />
                        <Input
                          label="Laboratory reference interval"
                          value={item.referenceText ?? ''}
                          onChange={(event) => setImportedValue(index, { referenceText: event.target.value || null })}
                          helperText="Copy the interval printed by this laboratory. It is not a personal treatment target."
                        />
                        <label className="block text-sm font-medium text-sage-700">
                          Flag printed by laboratory
                          <select
                            value={item.reportedFlag}
                            onChange={(event) => setImportedValue(index, { reportedFlag: event.target.value as typeof item.reportedFlag })}
                            className="mt-1.5 w-full rounded-lg border border-sand-200 bg-sand-50 px-3 py-3 text-base text-sage-800"
                          >
                            <option value="unknown">No flag shown</option>
                            <option value="normal">Normal / in range</option>
                            <option value="low">Low</option>
                            <option value="high">High</option>
                            <option value="abnormal">Abnormal</option>
                          </select>
                        </label>
                      </div>

                      {biomarker && item.normalizedValue !== null ? (
                        <p className="mt-3 text-xs leading-relaxed text-sage-500">
                          TrackHer chart value: {item.normalizedValue} {biomarker.unit}. The original reported value and unit are preserved.
                        </p>
                      ) : item.biomarkerKey ? (
                        <p className="mt-3 text-xs leading-relaxed text-sage-600">
                          I can preserve this result, but I can’t safely convert that unit for TrackHer’s chart. You can correct the mapped value in the fields below.
                        </p>
                      ) : (
                        <p className="mt-3 text-xs leading-relaxed text-sage-600">
                          I don’t recognize this as one of TrackHer’s charted markers, so I’ll preserve it exactly as an uncharted result.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-sand-200 bg-sand-100/60 p-4">
                <p className="text-sm font-medium text-sage-800">A reference interval is not your personal target</p>
                <p className="mt-1 text-sm leading-relaxed text-sage-600">
                  It shows how this laboratory compares results using its method and reference population. Being inside it does not by itself show whether your symptoms are controlled or whether treatment is right for you. A flagged result also needs clinical context. Talk with your doctor before drawing treatment conclusions.
                </p>
                {hasHrtImport && (
                  <a
                    href="https://thebms.org.uk/2025/07/new-bms-tool-for-clinicians-measurement-of-serum-estradiol-in-the-menopause-transition/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sage-700 underline underline-offset-2"
                  >
                    British Menopause Society guide to understanding estradiol blood tests
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                )}
              </div>

              {medicationMentions.map((name) => (
                <div key={name} className="rounded-xl border border-sage-200 bg-sage-50/40 p-4">
                  <div className="flex items-start gap-3">
                    <Moon className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" aria-hidden />
                    <div>
                      <p className="text-sm font-medium text-sage-800">
                        I found “{name}” on this report, but it isn’t in your TrackHer medication list. Do you currently take it?
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {([
                          ['yes', 'Yes, I take it'],
                          ['no', 'No'],
                          ['unsure', 'I’m not sure'],
                        ] as const).map(([answer, label]) => (
                          <button
                            key={answer}
                            type="button"
                            onClick={() => setMedicationAnswer(name, answer)}
                            className={`rounded-full border px-3 py-1.5 text-sm ${medicationAnswers[name] === answer ? 'border-sage-500 bg-sage-100 text-sage-800' : 'border-sand-300 bg-sand-50 text-sage-600'}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {medicationAnswers[name] === 'yes' && (
                        <p className="mt-2 text-xs text-sage-500">
                          After this report is saved, Luna will help you prepare it for medication review. It will not be added silently.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}

          <div className="rounded-xl border border-sand-200 bg-sand-50 p-6 space-y-4">
            <div>
              <label htmlFor="draw-date" className="mb-1 block text-sm font-medium text-sage-700">
                Date drawn
              </label>
              <input
                id="draw-date"
                type="date"
                value={drawDate}
                onChange={(e) => setDrawDate(e.target.value)}
                className="w-full rounded-lg border border-sand-200 px-3 py-2.5 text-base text-sage-800"
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
                className="w-full rounded-lg border border-sand-200 px-3 py-2.5 text-base text-sage-800"
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

          <div className="rounded-xl border border-sand-200 bg-sand-50 p-6">
            <label htmlFor="lab-notes" className="mb-2 block text-sm font-medium text-sage-700">
              Notes (optional)
            </label>
            <textarea
              id="lab-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={'e.g., "Drawn 2 hours after morning dose" or "Fasted 12 hours"'}
              className="w-full rounded-lg border border-sand-200 px-3 py-2 text-base text-sage-800 placeholder:text-sage-400"
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
