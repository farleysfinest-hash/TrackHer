import { useEffect, useState } from 'react';
import type { SymptomCheckin, ExtendedSymptomLog } from '../../types/database';
import { useCheckins } from '../../hooks/useCheckins';
import { useToast } from '../../stores/toastStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { MRSScoreBadge } from './MRSScoreBadge';
import { getSymptomByKey, MRS_CORE_SYMPTOMS } from '../../data/symptoms';
import { formatDateLong } from '../../utils/formatters';
import { CATEGORY_LABELS } from '../../utils/checkinHelpers';
import type { MRSSymptomKey } from '../../utils/checkinHelpers';

interface CheckinDetailModalProps {
  checkin: SymptomCheckin | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (checkin: SymptomCheckin) => void;
  onDeleted: () => void;
}

export function CheckinDetailModal({
  checkin,
  isOpen,
  onClose,
  onEdit,
  onDeleted,
}: CheckinDetailModalProps) {
  const { fetchCheckinDetail, deleteCheckin } = useCheckins();
  const toast = useToast();
  const [extended, setExtended] = useState<ExtendedSymptomLog[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!checkin || !isOpen) {
      setExtended([]);
      return;
    }

    let cancelled = false;
    void fetchCheckinDetail(checkin.id).then((detail) => {
      if (!cancelled && detail) setExtended(detail.extendedSymptoms);
    });

    return () => {
      cancelled = true;
    };
  }, [checkin?.id, isOpen, fetchCheckinDetail]);

  if (!checkin) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    const ok = await deleteCheckin(checkin.id);
    setIsDeleting(false);
    if (ok) {
      toast.success('Check-in deleted');
      onDeleted();
      onClose();
    } else {
      toast.error('Failed to delete check-in');
    }
  };

  const extendedByCategory = ['body', 'digestive', 'mind', 'sexual_pelvic', 'skin_hair'] as const;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Check-in Details" size="lg">
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sage-500">{formatDateLong(checkin.checkin_date)}</p>
              {checkin.overall_wellbeing !== null && (
                <p className="mt-1 text-lg font-medium text-sage-800">
                  Wellbeing: {checkin.overall_wellbeing}/10
                </p>
              )}
            </div>
            <MRSScoreBadge
              total={checkin.total_score}
              somatic={checkin.somatic_score}
              psychological={checkin.psychological_score}
              urogenital={checkin.urogenital_score}
            />
          </div>

          <div>
            <h3 className="mb-3 font-medium text-sage-800">MRS Symptoms</h3>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {[...MRS_CORE_SYMPTOMS]
                .sort((a, b) => (a.mrsIndex ?? 0) - (b.mrsIndex ?? 0))
                .map((symptom) => {
                  const score = checkin[symptom.key as MRSSymptomKey];
                  return (
                    <div
                      key={symptom.key}
                      className="flex justify-between rounded-lg bg-sand-50 px-3 py-2 text-sm"
                    >
                      <span className="text-sage-700">{symptom.label}</span>
                      <span className="font-medium text-sage-800">
                        {score ?? '—'}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {extended.length > 0 && (
            <div>
              <h3 className="mb-3 font-medium text-sage-800">Extended Symptoms</h3>
              {extendedByCategory.map((cat) => {
                const catSymptoms = extended.filter((e) => {
                  const def = getSymptomByKey(e.symptom_key);
                  return def?.category === cat;
                });
                if (catSymptoms.length === 0) return null;
                return (
                  <div key={cat} className="mb-3">
                    <p className="text-sm font-medium text-sage-600">
                      {CATEGORY_LABELS[cat]}
                    </p>
                    <ul className="mt-1 list-inside list-disc text-sm text-sage-700">
                      {catSymptoms.map((e) => (
                        <li key={e.id}>
                          {getSymptomByKey(e.symptom_key)?.label ?? e.symptom_key}
                          {e.severity ? ` (${e.severity})` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}

          {checkin.notes && (
            <div>
              <h3 className="mb-2 font-medium text-sage-800">Notes</h3>
              <p className="text-sm text-sage-600">{checkin.notes}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3 border-t border-sand-200 pt-4">
            <Button variant="secondary" onClick={() => onEdit(checkin)}>
              Edit this check-in
            </Button>
            <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
              Delete this check-in
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete check-in?"
        size="sm"
      >
        <p className="text-sm text-sage-600">
          This will permanently delete this check-in and all associated extended symptom data.
        </p>
        <div className="mt-4 flex gap-3">
          <Button variant="danger" isLoading={isDeleting} onClick={handleDelete}>
            Delete
          </Button>
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
}
