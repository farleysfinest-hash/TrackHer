import { useState } from 'react';
import { useCheckinStore } from '../../stores/checkinStore';
import { useCheckins } from '../../hooks/useCheckins';
import { useToast } from '../../stores/toastStore';
import { getLocalDateISO } from '../../utils/checkinHelpers';
import { useAuthStore } from '../../stores/authStore';
import { SEVERITY_LABELS } from '../../utils/checkinHelpers';
import { formatDateLong } from '../../utils/formatters';
import { MRSScoreBadge } from './MRSScoreBadge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface CheckinSummaryProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function CheckinSummary({ onBack, onSuccess }: CheckinSummaryProps) {
  const {
    wellbeingScore,
    mrsScores,
    extendedSymptoms,
    notes,
    mode,
    isEditing,
    editingCheckinId,
    getTotalMRS,
    getSomaticScore,
    getPsychologicalScore,
    getUrogenitalScore,
    getTopConcerns,
  } = useCheckinStore();
  const { createCheckin, updateCheckin } = useCheckins();
  const toast = useToast();
  const timezone = useAuthStore((s) => s.profile?.timezone);
  const [isSaving, setIsSaving] = useState(false);

  const total = getTotalMRS();
  const topConcerns = getTopConcerns();

  const handleSave = async () => {
    setIsSaving(true);
    const payload = {
      wellbeingScore,
      mrsScores,
      extendedSymptoms,
      notes,
      checkinDate: getLocalDateISO(timezone ?? undefined),
    };

    let ok: boolean | null = false;
    if (isEditing && editingCheckinId) {
      ok = await updateCheckin(editingCheckinId, payload);
    } else {
      const result = await createCheckin(payload);
      ok = !!result;
    }

    setIsSaving(false);
    if (ok) {
      toast.success(isEditing ? 'Check-in updated' : 'Check-in saved');
      onSuccess();
    } else {
      toast.error('Failed to save check-in');
    }
  };

  const today = formatDateLong(getLocalDateISO(timezone ?? undefined));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-sage-800">Check-in summary</h2>
        <p className="mt-1 text-sage-500">{today}</p>
      </div>

      <Card>
        <dl className="space-y-4 text-sm">
          {wellbeingScore !== null && (
            <div>
              <dt className="text-sage-500">Overall wellbeing</dt>
              <dd className="text-lg font-medium text-sage-800">{wellbeingScore}/10</dd>
            </div>
          )}

          <div>
            <MRSScoreBadge
              total={total}
              somatic={getSomaticScore()}
              psychological={getPsychologicalScore()}
              urogenital={getUrogenitalScore()}
            />
          </div>

          {topConcerns.length > 0 && (
            <div>
              <dt className="mb-2 text-sage-500">Top concerns</dt>
              <dd className="space-y-1">
                {topConcerns.map((c) => (
                  <p key={c.key} className="text-sage-700">
                    {c.label}{' '}
                    <span className="text-sage-500">
                      ({c.score} — {SEVERITY_LABELS[c.score]})
                    </span>
                  </p>
                ))}
              </dd>
            </div>
          )}

          {mode === 'full' && extendedSymptoms.length > 0 && (
            <div>
              <dt className="text-sage-500">Extended symptoms</dt>
              <dd className="text-sage-700">
                {extendedSymptoms.length} additional symptom
                {extendedSymptoms.length !== 1 ? 's' : ''} noted
              </dd>
            </div>
          )}

          {mode === 'full' && notes && (
            <div>
              <dt className="text-sage-500">Notes</dt>
              <dd className="text-sage-700 italic">&ldquo;{notes.slice(0, 120)}
                {notes.length > 120 ? '...' : ''}&rdquo;</dd>
            </div>
          )}
        </dl>
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          isLoading={isSaving}
          loadingText="Saving..."
          onClick={handleSave}
          className="flex-1"
        >
          Save Check-in
        </Button>
      </div>
    </div>
  );
}
