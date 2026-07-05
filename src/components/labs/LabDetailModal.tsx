import { useState } from 'react';
import type { LabResult } from '../../types/database';
import { useLabResults } from '../../hooks/useLabResults';
import { useToast } from '../../stores/toastStore';
import { getBiomarkersByCategory } from '../../data/labRanges';
import { LAB_CATEGORIES, getBiomarkerValue, countFilledLab } from '../../utils/labHelpers';
import { formatDateLong } from '../../utils/formatters';
import { LabValueDisplay } from './LabValueDisplay';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

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
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

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
