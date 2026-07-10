import { useState } from 'react';
import { useCheckinStore } from '../../stores/checkinStore';
import { useCheckins } from '../../hooks/useCheckins';
import { useQuickLog } from '../../hooks/useQuickLog';
import { useToast } from '../../stores/toastStore';
import {
  getLocalDateISO,
  getResolvedTimezone,
  SEVERITY_LABELS,
  INITIAL_MRS_SCORES,
  getMRSSeverityBand,
} from '../../utils/checkinHelpers';
import { DailyChannelsDisplay } from '../ui/DailyChannelsDisplay';
import type { SymptomCheckin } from '../../types/database';
import { useAuthStore } from '../../stores/authStore';
import { formatDateLong, formatLoggingDate } from '../../utils/formatters';
import { getSymptomByKey } from '../../data/symptoms';
import { getPrimaryInstrument } from '../../data/instruments/registry';
import { getItemStorageKey } from '../../data/instruments/scoring';
import { InstrumentScoreBadge } from './InstrumentScoreBadge';
import { CheckinReadout } from './CheckinReadout';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import type { MRSScore } from '../../types/database';

interface CheckinSummaryProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function CheckinSummary({ onBack, onSuccess }: CheckinSummaryProps) {
  const energyLevel = useCheckinStore((s) => s.energyLevel);
  const moodLevel = useCheckinStore((s) => s.moodLevel);
  const sleepQuality = useCheckinStore((s) => s.sleepQuality);
  const flareSelected = useCheckinStore((s) => s.flareSelected);
  const flarePreLogged = useCheckinStore((s) => s.flarePreLogged);
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
  const { createEvent } = useQuickLog();
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
      energyLevel,
      moodLevel,
      sleepQuality,
      mrsScores: isPulse ? { ...INITIAL_MRS_SCORES } : mrsScores,
      extendedSymptoms: isPulse
        ? []
        : extendedSymptoms.filter(
            (s): s is { symptom_key: string; severity: MRSScore } => s.severity !== null,
          ),
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

    if (ok) {
      const newFlares = flareSelected.filter((id) => !flarePreLogged.includes(id));
      for (const symptomId of newFlares) {
        await createEvent({ symptom_id: symptomId, severity: 0 });
      }
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

  const ratedExtended = extendedSymptoms.filter(
    (s): s is { symptom_key: string; severity: MRSScore } => s.severity !== null,
  );

  const previewCheckin = {
    energy_level: energyLevel,
    mood_level: moodLevel,
    sleep_quality: sleepQuality,
    overall_wellbeing: null,
  } as Pick<SymptomCheckin, 'energy_level' | 'mood_level' | 'sleep_quality' | 'overall_wellbeing'>;

  if (saveComplete && !isPulse) {
    return (
      <CheckinReadout
        scoreTotal={score.total}
        severityBand={severityBand}
        isBackdated={isBackdated}
        targetDate={targetDate}
        dateLabel={dateLabel}
        instrument={instrument}
        instrumentScore={score}
        previewCheckin={previewCheckin}
        ratedExtended={ratedExtended}
        notes={notes}
        onDone={onSuccess}
      />
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

      <Card>
        <p className="text-sm text-sage-500">Daily pulse</p>
        <div className="mt-2">
          <DailyChannelsDisplay checkin={previewCheckin} />
        </div>
      </Card>

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
