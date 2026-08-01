import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { LabResult } from '../../types/database';
import { useLabResults } from '../../hooks/useLabResults';
import { useToast } from '../../stores/toastStore';
import { getBiomarkersByCategory } from '../../data/labRanges';
import { LAB_CATEGORIES, getBiomarkerValue, countFilledLab } from '../../utils/labHelpers';
import { formatDateLong } from '../../utils/formatters';
import { LabValueDisplay } from './LabValueDisplay';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AskLunaButton } from '../luna/AskLunaButton';

interface LabDetailModalProps {
  lab: LabResult | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (lab: LabResult) => void;
  onDeleted: () => void;
}

export function LabDetailModal({
  lab,
  isOpen,
  onClose,
  onEdit,
  onDeleted,
}: LabDetailModalProps) {
  const { deleteLabResult, getPreviousValue } = useLabResults();
  const toast = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!lab) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    const ok = await deleteLabResult(lab.id);
    setIsDeleting(false);
    if (ok) {
      toast.success('Lab results deleted');
      setShowDeleteConfirm(false);
      onClose();
      onDeleted();
    } else {
      toast.error('Failed to delete lab results');
    }
  };

  const drawDetails = [
    lab.fasting === true ? 'Fasting' : lab.fasting === false ? 'Non-fasting' : null,
    lab.draw_time,
    lab.lab_name,
  ]
    .filter(Boolean)
    .join(' · ');
  const reportedValues = Object.values(lab.reported_values ?? {});
  const unchartedValues = reportedValues.filter((item) => !item.biomarkerKey);
  const hasHrtReportedValue = reportedValues.some((item) =>
    ['estradiol', 'estrone', 'progesterone', 'fsh', 'lh', 'total_testosterone', 'free_testosterone']
      .includes(item.biomarkerKey ?? ''),
  );

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={formatDateLong(lab.draw_date)} size="lg">
        <div className="space-y-6">
          {drawDetails && <p className="text-sm text-sage-500">{drawDetails}</p>}

          {LAB_CATEGORIES.map((cat) => {
            const biomarkers = getBiomarkersByCategory(cat.key).filter(
              (b) => getBiomarkerValue(lab, b.key) !== null,
            );
            if (biomarkers.length === 0) return null;

            return (
              <div key={cat.key}>
                <h3 className="mb-3 font-medium text-sage-800">{cat.label}</h3>
                <div className="space-y-4">
                  {biomarkers.map((b) => {
                    const value = getBiomarkerValue(lab, b.key)!;
                    const prev = getPreviousValue(b.key, lab.draw_date);
                    return (
                      <LabValueDisplay
                        key={b.key}
                        biomarkerKey={b.key}
                        value={value}
                        previousValue={prev}
                        reportedValue={(lab.reported_values ?? {})[b.key] ?? null}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

          {unchartedValues.length > 0 && (
            <div>
              <h3 className="mb-3 font-medium text-sage-800">Other reported results</h3>
              <div className="space-y-3">
                {unchartedValues.map((item, index) => (
                  <div key={`${item.reportedLabel}-${index}`} className="rounded-lg border border-sand-200 p-3">
                    <p className="font-medium text-sage-800">{item.reportedLabel}</p>
                    <p className="mt-1 select-text text-sm text-sage-700">
                      {item.comparator ?? ''}{item.reportedValue}{item.reportedUnit ? ` ${item.reportedUnit}` : ''}
                    </p>
                    {item.referenceText && (
                      <p className="mt-1 text-xs text-sage-500">
                        This laboratory’s reference interval: {item.referenceText}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-sage-400">
                      Preserved from the report; TrackHer does not currently chart this marker.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reportedValues.length > 0 && (
            <div className="rounded-xl bg-sand-100/70 p-4">
              <p className="text-sm font-medium text-sage-800">
                Your laboratory’s interval is not a personal treatment target
              </p>
              <p className="mt-1 text-sm leading-relaxed text-sage-600">
                Being inside it does not by itself show whether your symptoms are controlled or whether treatment is right for you. A flagged result also needs clinical context. Discuss both the result and how you feel with your doctor.
              </p>
              {hasHrtReportedValue && (
                <a
                  href="https://thebms.org.uk/2022/12/bms-statement-hrt-prescribing/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sage-700 underline underline-offset-2"
                >
                  British Menopause Society guidance
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              )}
            </div>
          )}

          {lab.notes && (
            <div>
              <h3 className="mb-1 text-sm font-medium text-sage-500">Notes</h3>
              <p className="text-sage-700 italic">&ldquo;{lab.notes}&rdquo;</p>
            </div>
          )}

          <p className="text-xs text-sage-400">
            {countFilledLab(lab)} biomarker{countFilledLab(lab) !== 1 ? 's' : ''} entered
          </p>

          <div className="flex flex-wrap gap-3 border-t border-sand-100 pt-4">
            <AskLunaButton
              label="Ask Luna about this result"
              onBeforeOpen={onClose}
              request={{
                kind: 'lab',
                title: `Lab result from ${formatDateLong(lab.draw_date)}`,
                context: {
                  sourceType: 'lab',
                  sourceId: lab.id,
                  label: `Lab result from ${formatDateLong(lab.draw_date)}`,
                  labResult: lab,
                },
                seedMessage: 'Help me understand this lab result alongside how I have been feeling.',
              }}
            />
            <Button variant="secondary" onClick={() => onEdit(lab)}>
              Edit this lab result
            </Button>
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(true)}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete lab results?"
        size="sm"
      >
        <p className="text-sm text-sage-600">
          This will permanently delete this lab draw and all associated values.
        </p>
        <div className="mt-4 flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowDeleteConfirm(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            isLoading={isDeleting}
            loadingText="Deleting..."
            onClick={() => void handleDelete()}
            className="flex-1 bg-danger hover:bg-danger/90"
          >
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
