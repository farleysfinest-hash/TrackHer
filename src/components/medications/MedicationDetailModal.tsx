import { useEffect, useState } from 'react';
import type { Medication } from '../../types/database';
import { useMedications } from '../../hooks/useMedications';
import { useMedicationChanges } from '../../hooks/useMedicationChanges';
import { useToast } from '../../stores/toastStore';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { DoseChangeForm } from './DoseChangeForm';
import {
  formatApplicationSite,
  getHormoneLabel,
  getPelletReplacementDate,
  findCatalogProductForMedication,
  formatMedicationDoseShort,
} from '../../utils/medicationHelpers';
import { DELIVERY_METHOD_LABELS } from '../../lib/medicationConstants';
import { formatDateLong } from '../../utils/formatters';

interface MedicationDetailModalProps {
  medication: Medication | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function MedicationDetailModal({
  medication,
  isOpen,
  onClose,
  onRefresh,
}: MedicationDetailModalProps) {
  const { updateMedication } = useMedications();
  const { changes, fetchChanges } = useMedicationChanges();
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showDoseChange, setShowDoseChange] = useState(false);
  const [notes, setNotes] = useState('');
  const [prescriber, setPrescriber] = useState('');
  const [pharmacy, setPharmacy] = useState('');
  const [applicationSite, setApplicationSite] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (medication && isOpen) {
      setNotes(medication.notes ?? '');
      setPrescriber(medication.prescriber_name ?? '');
      setPharmacy(medication.pharmacy_name ?? '');
      setApplicationSite(medication.application_site ?? '');
      void fetchChanges(medication.id);
    }
  }, [medication, isOpen, fetchChanges]);

  if (!medication) return null;

  const typeLabel = `${getHormoneLabel(medication.hormone_category)} ${DELIVERY_METHOD_LABELS[medication.delivery_method]?.label ?? medication.delivery_method}`;

  const handleSave = async () => {
    setIsSaving(true);
    const ok = await updateMedication(medication.id, {
      notes: notes || undefined,
      prescriber_name: prescriber || undefined,
      pharmacy_name: pharmacy || undefined,
      application_site: applicationSite || undefined,
    });
    setIsSaving(false);
    if (ok) {
      toast.success('Medication updated');
      setIsEditing(false);
      onRefresh();
    } else {
      toast.error('Failed to update');
    }
  };

  const formatChangeEntry = (change: (typeof changes)[0]) => {
    const date = formatDateLong(change.change_date);
    const medName = medication.medication_name;

    switch (change.change_type) {
      case 'started':
        return `${date} — Started at ${change.new_dose ?? medication.dose_amount} ${medication.dose_unit}`;
      case 'stopped':
        return `${date} — Discontinued${change.notes ? `. Reason: ${change.notes}` : ''}`;
      case 'dose_increased':
        return `${date} — Increased from ${change.previous_dose} → ${change.new_dose} ${medication.dose_unit}${change.notes ? `. ${change.notes}` : ''}`;
      case 'dose_decreased':
        return `${date} — Decreased from ${change.previous_dose} → ${change.new_dose} ${medication.dose_unit}${change.notes ? `. ${change.notes}` : ''}`;
      case 'frequency_changed':
        return `${date} — Frequency changed${change.notes ? `. ${change.notes}` : ''}`;
      default:
        return `${date} — ${change.change_type.replace(/_/g, ' ')} ${medName}`;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={medication.medication_name} size="lg">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-sage-500">{typeLabel}</p>
          <p className="mt-1 text-lg text-sage-800">
            {formatMedicationDoseShort(medication)}
          </p>
        </div>

        {showDoseChange ? (
          <DoseChangeForm
            medication={medication}
            catalogProduct={findCatalogProductForMedication(medication)}
            onCancel={() => setShowDoseChange(false)}
            onSuccess={() => {
              setShowDoseChange(false);
              void fetchChanges(medication.id);
              onRefresh();
            }}
          />
        ) : (
          <>
            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-sage-500">Start date</dt>
                <dd>{formatDateLong(medication.start_date)}</dd>
              </div>
              {medication.application_site && (
                <div className="flex justify-between">
                  <dt className="text-sage-500">Application site</dt>
                  <dd>
                    {isEditing ? (
                      <Input
                        value={applicationSite}
                        onChange={(e) => setApplicationSite(e.target.value)}
                      />
                    ) : (
                      formatApplicationSite(medication.application_site)
                    )}
                  </dd>
                </div>
              )}
              {medication.pellet_insertion_date && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-sage-500">Pellet inserted</dt>
                    <dd>{formatDateLong(medication.pellet_insertion_date)}</dd>
                  </div>
                  {medication.pellet_expected_duration_months && (
                    <div className="flex justify-between">
                      <dt className="text-sage-500">Expected replacement</dt>
                      <dd>
                        {formatDateLong(
                          getPelletReplacementDate(
                            medication.pellet_insertion_date,
                            medication.pellet_expected_duration_months,
                          ),
                        )}
                      </dd>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between">
                <dt className="text-sage-500">Prescriber</dt>
                <dd>
                  {isEditing ? (
                    <Input value={prescriber} onChange={(e) => setPrescriber(e.target.value)} />
                  ) : (
                    medication.prescriber_name || '—'
                  )}
                </dd>
              </div>
              {medication.pharmacy_name && (
                <div className="flex justify-between">
                  <dt className="text-sage-500">Pharmacy</dt>
                  <dd>
                    {isEditing ? (
                      <Input value={pharmacy} onChange={(e) => setPharmacy(e.target.value)} />
                    ) : (
                      medication.pharmacy_name
                    )}
                  </dd>
                </div>
              )}
            </dl>

            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Notes</label>
              {isEditing ? (
                <textarea
                  className="w-full rounded-lg border border-sand-200 px-4 py-3 text-sm"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              ) : (
                <p className="text-sm text-sage-600">{medication.notes || '—'}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {!isEditing ? (
                <>
                  <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                    Edit Details
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowDoseChange(true)}>
                    Change Dose
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" isLoading={isSaving} onClick={handleSave}>
                    Save
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </>
        )}

        <div className="border-t border-sand-200 pt-4">
          <h3 className="mb-3 font-display text-lg text-sage-800">Change History</h3>
          {changes.length === 0 ? (
            <p className="text-sm text-sage-400">No changes recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {changes.map((change) => (
                <li key={change.id} className="text-sm text-sage-600">
                  {formatChangeEntry(change)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
