import { useState } from 'react';
import { useCheckinStore } from '../../stores/checkinStore';
import { useCheckins } from '../../hooks/useCheckins';
import { useToast } from '../../stores/toastStore';
import {
  getLocalDateISO,
  getResolvedTimezone,
  SEVERITY_LABELS,
  INITIAL_MRS_SCORES,
  getMRSSeverityBand,
  MRS_TOTAL_MAX,
} from '../../utils/checkinHelpers';
import { useAuthStore } from '../../stores/authStore';
import { formatDateLong, formatLoggingDate } from '../../utils/formatters';
import { getSymptomByKey } from '../../data/symptoms';
import { getPrimaryInstrument } from '../../data/instruments/registry';
import { getItemStorageKey } from '../../data/instruments/scoring';
import { InstrumentScoreBadge } from './InstrumentScoreBadge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface CheckinSummaryProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function CheckinSummary({ onBack, onSuccess }: CheckinSummaryProps) {
  const wellbeingScore = useCheckinStore((s) => s.wellbeingScore);
  const extendedSymptoms = useCheckinStore((s) => s.extendedSymptoms);
  const notes = useCheckinStore((s) => s.notes);
  const mode = useCheckinStore((s) => s.mode);
  const isEditing = useCheckinStore((s) => s.isEditing);
  const editingCheckinId = useCheckinStore((s) => s.editingCheckinId);
  const mrsScores = useCheckinStore((s) => s.mrsScores);
  const instrumentId = useCheckinStore((s) => s.instrumentId);
  const targetDate = useCheckinStore((s) => s.targetDate);
  const getInstrumentScore = useCheckinStore((s) => s.getInstrumentScore);
  const getTopConcerns = useCheckinStore((s) => s.getTopConcerns);
  const strawStage = useAuthStore((s) => s.profile?.straw_stage ?? '-2');
  const instrument = getPrimaryInstrument(strawStage);
  const { createCheckin, updateCheckin } = useCheckins();
  const toast = useToast();
  const timezone = getResolvedTimezone(useAuthStore((s) => s.profile?.timezone));
  const todayStr = getLocalDateISO(timezone);
  const isBackdated = targetDate !== todayStr;
  const [isSaving, setIsSaving] = useState(false);
  const [saveComplete, setSaveComplete] = useState(false);

  const score = getInstrumentScore(instrument);
  const topConcerns = getTopConcerns();
  const severityBand = getMRSSeverityBand(score.total);

  const topConcernLabels = topConcerns.map((c) => {
    const item = instrument.items.find((i) => getItemStorageKey(i) === c.key);
    return { ...c, label: item?.label ?? c.label };
  });

  const isPulse = mode === 'quick';

  const handleSave = async () => {
    setIsSaving(true);
    const payload = {
      wellbeingScore,
      mrsScores: isPulse ? { ...INITIAL_MRS_SCORES } : mrsScores,
      extendedSymptoms: isPulse ? [] : extendedSymptoms,
      notes: isPulse ? '' : notes,
      checkinDate: targetDate,
      instrumentId,
      checkinType: isPulse ? ('pulse' as const) : ('full' as const),
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
      localStorage.setItem('trackher_first_checkin_done', 'true');
      toast.success(isEditing ? 'Check-in updated' : isPulse ? 'Pulse saved' : 'Check-in saved');
      if (isPulse) {
        onSuccess();
      } else {
        setSaveComplete(true);
      }
    } else {
      toast.error('Failed to save check-in');
    }
  };

  const dateLabel = isBackdated ? formatLoggingDate(targetDate) : formatDateLong(targetDate);

  const ratedExtended = extendedSymptoms.filter((s) => s.severity !== null);

  if (saveComplete && !isPulse) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl text-sage-800">Check-in saved</h2>
          <p className="mt-1 text-sage-500">
            {isBackdated ? `Logged for ${dateLabel}` : dateLabel}
          </p>
        </div>

        <Card className="border-l-4 border-l-sage-500">
          <p className="text-sm text-sage-500">Your MRS score</p>
          <p className="mt-1 font-display text-3xl text-sage-800">
            {score.total}
            <span className="text-lg text-sage-400">/{MRS_TOTAL_MAX}</span>
          </p>
          <p className="mt-2 text-sm font-medium text-sage-700">
            {severityBand.bandLabel.charAt(0).toUpperCase() + severityBand.bandLabel.slice(1)}{' '}
            symptom severity
          </p>
          <p className="mt-2 text-sm text-sage-600">{severityBand.meaning}</p>
          <p className="mt-3 text-xs text-sage-400">
            This is your baseline on the Menopause Rating Scale — future check-ins measure change
            against it.
          </p>
        </Card>

        <Button onClick={onSuccess} className="w-full">
          Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-sage-800">Check-in summary</h2>
        <p className="mt-1 text-sage-500">
          {isBackdated ? `Logging for ${dateLabel}` : dateLabel}
        </p>
      </div>

      {wellbeingScore !== null && (
        <Card>
          <p className="text-sm text-sage-500">Overall wellbeing</p>
          <p className="text-lg font-medium text-sage-800">{wellbeingScore}/10</p>
        </Card>
      )}

      {!isPulse && (
        <Card className="border-l-4 border-l-sage-500">
          <h3 className="mb-3 font-display text-lg text-sage-800">
            {instrument.name} ({instrument.abbreviation})
          </h3>
          <InstrumentScoreBadge instrument={instrument} score={score} />
          {topConcernLabels.length > 0 && (
            <div className="mt-4 border-t border-sand-100 pt-4">
              <p className="mb-2 text-sm text-sage-500">Top {instrument.abbreviation} concerns</p>
              <ul className="space-y-1 text-sm text-sage-700">
                {topConcernLabels.map((c) => (
                  <li key={c.key}>
                    {c.label}{' '}
                    <span className="text-sage-500">
                      ({c.score} — {SEVERITY_LABELS[c.score]})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {mode === 'full' && ratedExtended.length > 0 && (
        <Card className="border-l-4 border-l-amber-400 bg-gradient-to-br from-white to-sand-50/50">
          <h3 className="mb-3 font-display text-lg text-sage-800">Personal Tracker</h3>
          <ul className="space-y-2 text-sm">
            {ratedExtended.map((s) => {
              const def = getSymptomByKey(s.symptom_key);
              return (
                <li key={s.symptom_key} className="flex justify-between text-sage-700">
                  <span>{def?.label ?? s.symptom_key}</span>
                  <span className="text-sage-500">
                    {s.severity} — {SEVERITY_LABELS[s.severity]}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {mode === 'full' && notes && (
        <Card>
          <p className="text-sm text-sage-500">Notes</p>
          <p className="mt-1 text-sage-700 italic">
            &ldquo;{notes.slice(0, 200)}
            {notes.length > 200 ? '...' : ''}&rdquo;
          </p>
        </Card>
      )}

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
