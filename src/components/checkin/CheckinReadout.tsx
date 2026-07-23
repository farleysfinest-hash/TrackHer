import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useCheckins } from '../../hooks/useCheckins';
import { useInsights } from '../../hooks/useInsights';
import { useMedicationChanges } from '../../hooks/useMedicationChanges';
import { useStageProfile } from '../../hooks/useStageProfile';
import { useAuthStore } from '../../stores/authStore';
import { getStageMrsFraming } from '../../engine/stageProfile';
import { getSymptomByKey } from '../../data/symptoms';
import {
  hasMRSData,
  getIncompleteMrsMessage,
  type MRSSeverityBandInfo,
  MRS_TOTAL_MAX,
  SEVERITY_LABELS,
  getResolvedTimezone,
} from '../../utils/checkinHelpers';
import { DailyChannelsDisplay } from '../ui/DailyChannelsDisplay';
import {
  formatMrsDeltaLine,
  formatMrsHeadline,
  getStrongestInsightPhrase,
  getCoverageFallbackPhrase,
  getActiveExperimentReadout,
  getNextRhythmReadout,
} from '../../utils/checkinReadoutHelpers';
import type { SymptomCheckin, MRSScore } from '../../types/database';
import type { InstrumentDefinition, InstrumentScore } from '../../types/instruments';
import { InstrumentScoreBadge } from './InstrumentScoreBadge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface CheckinReadoutProps {
  scoreTotal: number | null;
  isComplete: boolean;
  missingItemCount: number;
  severityBand: MRSSeverityBandInfo | null;
  isBackdated: boolean;
  targetDate: string;
  dateLabel: string;
  instrument: InstrumentDefinition;
  instrumentScore: InstrumentScore;
  previewCheckin: Pick<
    SymptomCheckin,
    'energy_level' | 'mood_level' | 'sleep_quality' | 'overall_wellbeing' | 'bleeding_flow'
  >;
  ratedExtended: Array<{ symptom_key: string; severity: MRSScore }>;
  notes: string;
  onDone: () => void;
  /** Optional content above Done (e.g. post-MRS nudge). */
  beforeDone?: ReactNode;
}

export function CheckinReadout({
  scoreTotal,
  isComplete,
  missingItemCount,
  severityBand,
  isBackdated,
  targetDate,
  dateLabel,
  instrument,
  instrumentScore,
  previewCheckin,
  ratedExtended,
  notes,
  onDone,
  beforeDone,
}: CheckinReadoutProps) {
  const [showAllScores, setShowAllScores] = useState(false);
  const { checkins, fetchCheckins } = useCheckins();
  const { insights } = useInsights();
  const { changes, fetchChanges } = useMedicationChanges();
  const stageProfile = useStageProfile();
  const profile = useAuthStore((s) => s.profile);
  const timezone = getResolvedTimezone(profile?.timezone);

  useEffect(() => {
    void fetchCheckins(100);
    void fetchChanges();
  }, [fetchCheckins, fetchChanges]);

  const mrsCheckins = useMemo(
    () =>
      [...checkins]
        .filter(hasMRSData)
        .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date)),
    [checkins],
  );

  const previousMrsTotal = useMemo(() => {
    const prior = mrsCheckins.find((c) => c.checkin_date < targetDate);
    return prior?.total_score ?? null;
  }, [mrsCheckins, targetDate]);

  const deltaLine =
    isComplete && scoreTotal !== null && severityBand
      ? formatMrsDeltaLine(scoreTotal, previousMrsTotal, isBackdated)
      : null;
  const mrsHeadline =
    isComplete && scoreTotal !== null && severityBand && deltaLine
      ? formatMrsHeadline(scoreTotal, severityBand, deltaLine)
      : getIncompleteMrsMessage(missingItemCount);
  const stageFraming = getStageMrsFraming(stageProfile);

  const patternPhrase =
    getStrongestInsightPhrase(insights) ?? getCoverageFallbackPhrase(mrsCheckins.length);

  const experimentReadout = getActiveExperimentReadout(changes, timezone);
  const rhythmReadout = getNextRhythmReadout(profile);
  const whatsNext = experimentReadout ?? rhythmReadout;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-sage-800">Here&apos;s what we see</h2>
        <p className="mt-1 text-sage-500">{dateLabel}</p>
      </div>

      <Card className="border-l-4 border-l-sage-500">
        <p className="text-xs font-medium uppercase tracking-wide text-sage-500">Your MRS</p>
        <p className="mt-2 font-display text-xl text-sage-800">{mrsHeadline}</p>
        {severityBand ? (
          <p className="mt-2 text-sm text-sage-600">{severityBand.meaning}</p>
        ) : (
          <p className="mt-2 text-sm text-sage-600">
            You can return to this check-in anytime to answer the remaining questions.
          </p>
        )}
        {stageFraming ? (
          <p className="mt-3 text-sm text-sage-500">{stageFraming}</p>
        ) : (
          <p className="mt-3 text-sm text-sage-500">
            Your score uses the Menopause Rating Scale — a validated measure your provider
            recognizes.
          </p>
        )}
      </Card>

      <Card className="border-l-4 border-l-clay-400">
        <p className="text-xs font-medium uppercase tracking-wide text-sage-500">One pattern</p>
        <p className="mt-2 text-sm leading-relaxed text-sage-700">{patternPhrase}</p>
      </Card>

      <Card className="border-l-4 border-l-sage-300">
        <p className="text-xs font-medium uppercase tracking-wide text-sage-500">What&apos;s next</p>
        <p className="mt-2 font-medium text-sage-800">{whatsNext.headline}</p>
        <p className="mt-1 text-sm text-sage-600">{whatsNext.body}</p>
      </Card>

      <button
        type="button"
        onClick={() => setShowAllScores((v) => !v)}
        className="text-sm font-medium text-sage-600 underline hover:text-sage-800"
      >
        {showAllScores ? 'Hide detailed scores' : 'See all scores'}
      </button>

      {showAllScores && (
        <div className="space-y-4 rounded-xl border border-sand-200 bg-white p-4">
          <Card variant="outlined" padding="sm">
            <p className="text-sm text-sage-500">Daily pulse</p>
            <div className="mt-2">
              <DailyChannelsDisplay checkin={previewCheckin} />
            </div>
          </Card>
          <Card variant="outlined" padding="sm">
            <InstrumentScoreBadge instrument={instrument} score={instrumentScore} />
            <p className="mt-2 text-xs text-sage-400">
              {isComplete && scoreTotal !== null
                ? `Total ${instrument.abbreviation}: ${scoreTotal}/${MRS_TOTAL_MAX}`
                : getIncompleteMrsMessage(missingItemCount)}
            </p>
          </Card>
          {ratedExtended.length > 0 && (
            <ul className="space-y-1 text-sm text-sage-700">
              {ratedExtended.map((s) => {
                const def = getSymptomByKey(s.symptom_key);
                return (
                  <li key={s.symptom_key} className="flex justify-between gap-2">
                    <span>{def?.label ?? s.symptom_key}</span>
                    <span className="shrink-0 text-sage-500">
                      {s.severity} — {SEVERITY_LABELS[s.severity]}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {notes && <p className="text-sm italic text-sage-600">&ldquo;{notes}&rdquo;</p>}
        </div>
      )}

      {beforeDone}

      <Button onClick={onDone} className="w-full">
        Done
      </Button>
    </div>
  );
}
