import { useEffect, useRef, useState } from 'react';
import { Camera, FileImage, Moon, ShieldCheck, X } from 'lucide-react';
import { invokeLabReportExtraction } from '../../hooks/useAiAssistant';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import type { LabReportExtractionDraft } from '../../utils/labReportExtraction';
import { Button } from '../ui/Button';

interface LabReportImportDialogProps {
  isOpen: boolean;
  medicationNames: string[];
  onClose: () => void;
  onImported: (draft: LabReportExtractionDraft, unknownMedicationMentions: string[]) => void;
}

const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_BYTES = 8 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Could not read that image.'));
    reader.readAsDataURL(file);
  });
}

function normalizeMedicationName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function LabReportImportDialog({
  isOpen,
  medicationNames,
  onClose,
  onImported,
}: LabReportImportDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);

  useFocusTrap(isOpen, dialogRef, onClose);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setError(null);
      setIsReading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const chooseFile = (nextFile: File | undefined) => {
    setError(null);
    if (!nextFile) return;
    if (!SUPPORTED_TYPES.has(nextFile.type)) {
      setFile(null);
      setError('Use a JPEG, PNG, or WebP image. If your iPhone saved HEIC, take a screenshot and use that.');
      return;
    }
    if (nextFile.size > MAX_FILE_BYTES) {
      setFile(null);
      setError('That image is larger than 8 MB. Crop it to the report page and try again.');
      return;
    }
    setFile(nextFile);
  };

  const extract = async () => {
    if (!file || isReading) return;
    setIsReading(true);
    setError(null);
    try {
      const dataUrl = await readAsDataUrl(file);
      const draft = await invokeLabReportExtraction({
        fileName: file.name,
        mimeType: file.type,
        dataUrl,
        knownMedications: medicationNames,
      });
      if (!draft) {
        setError('I couldn’t read enough of that report safely. Try a brighter, straighter photo with the values and units visible.');
        return;
      }
      const known = new Set(medicationNames.map(normalizeMedicationName));
      const unknownMentions = draft.medicationMentions.filter(
        (name) => !known.has(normalizeMedicationName(name)),
      );
      onImported({ ...draft, previewDataUrl: dataUrl }, unknownMentions);
    } catch (readError) {
      setError('Could not read that report. Please check the file format and try again.');
    } finally {
      setIsReading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-black/40 sm:items-center sm:p-4" style={{ touchAction: 'none' }}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lab-import-title"
        className="safe-area-bottom max-h-[94vh] w-full overflow-y-auto overscroll-contain rounded-t-2xl bg-sand-50 p-5 outline-none sm:max-w-xl sm:rounded-2xl sm:p-6"
        style={{ touchAction: 'pan-y' }}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-600">
            <Moon className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="lab-import-title" className="font-display text-xl text-sage-800">
              Let Luna read your report
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-sage-600">
              Take a clear photo or choose an image. I’ll prepare a draft, then you’ll check every value before anything is saved.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-sage-400 hover:bg-sage-50 hover:text-sage-600"
            aria-label="Close lab report import"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            chooseFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />

        {previewUrl ? (
          <div className="mt-5 overflow-hidden rounded-xl border border-sand-200 bg-sand-100">
            <img src={previewUrl} alt="Selected laboratory report" className="max-h-72 w-full object-contain" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-5 flex min-h-52 w-full flex-col items-center justify-center rounded-xl border border-dashed border-sage-300 bg-sage-50/40 px-6 text-center hover:bg-sage-50"
          >
            <Camera className="h-8 w-8 text-sage-500" aria-hidden />
            <span className="mt-3 font-medium text-sage-700">Photograph or choose a report</span>
            <span className="mt-1 text-sm text-sage-500">JPEG, PNG, or WebP · up to 8 MB</span>
          </button>
        )}

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-sand-100 px-3 py-3 text-xs leading-relaxed text-sage-600">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            The image is sent securely for extraction and is not kept in your TrackHer records. Only the values you confirm are saved.
          </p>
        </div>

        {error && <p className="mt-4 text-sm text-danger" role="alert">{error}</p>}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          {file && (
            <Button variant="secondary" onClick={() => inputRef.current?.click()}>
              <FileImage className="h-4 w-4" aria-hidden />
              Choose another
            </Button>
          )}
          <Button
            isLoading={isReading}
            loadingText="Reading report…"
            onClick={() => file ? void extract() : inputRef.current?.click()}
          >
            {file ? 'Review extracted values' : 'Choose a report photo'}
          </Button>
        </div>
      </div>
    </div>
  );
}
