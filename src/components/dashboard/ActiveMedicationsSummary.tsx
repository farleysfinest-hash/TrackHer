import { Link } from 'react-router-dom';
import type { Medication } from '../../types/database';
import { Card } from '../ui/Card';
import { getHormoneColor, getHormoneLabel, formatFrequency } from '../../utils/medicationHelpers';

interface ActiveMedicationsSummaryProps {
  medications: Medication[];
}

export function ActiveMedicationsSummary({ medications }: ActiveMedicationsSummaryProps) {
  const active = medications.filter((m) => m.is_active);

  return (
    <Card>
      <h2 className="font-display text-lg text-sage-800">Current Medications</h2>

      {active.length === 0 ? (
        <p className="mt-3 text-sm text-sage-500">No active medications yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {active.map((med) => (
            <li key={med.id} className="flex items-start gap-3 text-sm">
              <span
                className={[
                  'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  getHormoneColor(med.hormone_category),
                ].join(' ')}
              >
                {getHormoneLabel(med.hormone_category).charAt(0)}
              </span>
              <span className="text-sage-700">
                <strong>{med.medication_name}</strong> {med.dose_amount} {med.dose_unit} ·{' '}
                {formatFrequency(med.frequency)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Link
        to="/medications"
        className="mt-4 inline-block text-sm font-medium text-sage-600 hover:text-sage-800"
      >
        Manage Medications →
      </Link>
    </Card>
  );
}
