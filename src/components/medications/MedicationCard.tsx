import { memo, useState } from 'react';
import type { Medication } from '../../types/database';
import { useAuthStore } from '../../stores/authStore';
import {
  formatApplicationSite,
  getHormoneColor,
  getHormoneLabel,
  isPelletDueSoon,
  getPelletReplacementDate,
  findCatalogProductForMedication,
  formatMedicationDoseShort,
} from '../../utils/medicationHelpers';
import { getLocalDateISO, getResolvedTimezone } from '../../utils/checkinHelpers';
import { DELIVERY_METHOD_LABELS } from '../../lib/medicationConstants';
import { formatDateLong } from '../../utils/formatters';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { DoseChangeForm } from './DoseChangeForm';

interface MedicationCardProps {
  medication: Medication;
  catalogKey?: string;
  onEdit: (med: Medication) => void;
  onDiscontinue: (med: Medication) => void;
  onRefresh: () => void;
}

function MedicationCardComponent({
  medication,
  onEdit,
  onDiscontinue,
  onRefresh,
}: MedicationCardProps) {
  const [showDoseChange, setShowDoseChange] = useState(false);
  const catalogProduct = findCatalogProductForMedication(medication);
  const timezone = getResolvedTimezone(useAuthStore((s) => s.profile?.timezone));
  const today = getLocalDateISO(timezone);

  const typeLabel = `${getHormoneLabel(medication.hormone_category)} ${DELIVERY_METHOD_LABELS[medication.delivery_method]?.label ?? medication.delivery_method}`;

  const pelletDue =
    medication.delivery_method === 'pellet' &&
    medication.pellet_insertion_date &&
    medication.pellet_expected_duration_months &&
    isPelletDueSoon(
      medication.pellet_insertion_date,
      medication.pellet_expected_duration_months,
      today,
    );

  const pelletReplaceMonth =
    medication.pellet_insertion_date && medication.pellet_expected_duration_months
      ? getPelletReplacementDate(
          medication.pellet_insertion_date,
          medication.pellet_expected_duration_months,
        ).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : null;

  return (
    <div className="rounded-xl border border-sand-200 bg-sand-50 p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-2">
        <span
          className={[
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
            getHormoneColor(medication.hormone_category),
          ].join(' ')}
        >
          {getHormoneLabel(medication.hormone_category).charAt(0)}
        </span>
        <div className="flex flex-wrap gap-1">
          {medication.is_active ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="neutral">Discontinued</Badge>
          )}
          {medication.delivery_method === 'pellet' && pelletReplaceMonth && (
            <Badge variant={pelletDue ? 'warning' : 'info'}>
              Pellet · Replace ~{pelletReplaceMonth}
            </Badge>
          )}
        </div>
      </div>

      <h3 className="font-display text-lg text-sage-800">{medication.medication_name}</h3>
      <p className="mt-1 text-sm text-sage-600">{typeLabel}</p>
      <p className="mt-2 text-sage-700">
        {formatMedicationDoseShort(medication)}
      </p>

      <p className="mt-3 text-sm text-sage-400">
        Started: {formatDateLong(medication.start_date)}
      </p>
      {medication.application_site && (
        <p className="text-sm text-sage-400">
          Applied to: {formatApplicationSite(medication.application_site)}
        </p>
      )}

      {showDoseChange ? (
        <div className="mt-4 border-t border-sand-200 pt-4">
          <DoseChangeForm
            medication={medication}
            catalogProduct={catalogProduct}
            onCancel={() => setShowDoseChange(false)}
            onSuccess={() => {
              setShowDoseChange(false);
              onRefresh();
            }}
          />
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-sand-200 pt-4">
          <Button variant="ghost" size="sm" onClick={() => onEdit(medication)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowDoseChange(true)}>
            Change Dose
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDiscontinue(medication)}>
            Remove...
          </Button>
        </div>
      )}
    </div>
  );
}

export const MedicationCard = memo(MedicationCardComponent);
