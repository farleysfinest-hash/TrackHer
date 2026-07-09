import { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { useCheckinStore } from '../../stores/checkinStore';
import { useAuthStore } from '../../stores/authStore';
import type { MRSScore } from '../../types/database';
import type { InstrumentDefinition } from '../../types/instruments';
import {
  getTimeframeLabel,
  countRatedInstrumentItems,
} from '../../utils/checkinHelpers';
import { getItemStorageKey } from '../../data/instruments/scoring';
import { SeveritySlider } from './SeveritySlider';
import { InstrumentScoreBadge } from './InstrumentScoreBadge';
import { Button } from '../ui/Button';
import { UROGENITAL_NORMALIZATION_COPY } from '../../utils/echoHelpers';

const INSTRUMENT_TOOLTIP_KEY = 'predicther_instrument_tooltip_dismissed';
const FIRST_CHECKIN_DONE_KEY = 'trackher_first_checkin_done';

const SUBSCALE_DISPLAY_LABELS: Record<string, string> = {
  psychological: 'Mood & mind',
  somatic: 'Body',
  urogenital: 'Urinary & vaginal',
};

interface InstrumentSectionProps {
  instrument: InstrumentDefinition;
  onNext: () => void;
  onBack: () => void;
}

export function InstrumentSection({ instrument, onNext, onBack }: InstrumentSectionProps) {
  const mrsScores = useCheckinStore((s) => s.mrsScores);
  const setMRSScore = useCheckinStore((s) => s.setMRSScore);
  const getInstrumentScore = useCheckinStore((s) => s.getInstrumentScore);
  const frequency = useAuthStore((s) => s.profile?.checkin_frequency);
  const [showTooltip, setShowTooltip] = useState(
    () => localStorage.getItem(INSTRUMENT_TOOLTIP_KEY) !== 'true',
  );
  const [dismissedNudge, setDismissedNudge] = useState(false);

  const ratedCount = countRatedInstrumentItems(mrsScores, instrument);
  const isReturningCheckinUser = localStorage.getItem(FIRST_CHECKIN_DONE_KEY) === 'true';
  const showNudge =
    isReturningCheckinUser &&
    ratedCount < Math.ceil(instrument.items.length * 0.7) &&
    !dismissedNudge;
  const score = getInstrumentScore(instrument);

  const subscaleOrder = instrument.subscales.map((s) => s.id);
  const itemsBySubscale = new Map<string, typeof instrument.items>();
  for (const subscale of instrument.subscales) {
    itemsBySubscale.set(
      subscale.id,
      instrument.items.filter((item) => item.subscale === subscale.id),
    );
  }

  const handleScoreChange = useCallback(
    (storageKey: string, value: MRSScore) => {
      setMRSScore(storageKey as Parameters<typeof setMRSScore>[0], value);
    },
    [setMRSScore],
  );

  const dismissTooltip = () => {
    localStorage.setItem(INSTRUMENT_TOOLTIP_KEY, 'true');
    setShowTooltip(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-sage-800">How have these symptoms felt?</h2>
        <p className="mt-2 text-sage-500">{getTimeframeLabel(frequency)}</p>
      </div>

      {showTooltip && (
        <div className="rounded-lg border border-sage-200 bg-sage-50 p-4 text-sm text-sage-700">
          <div className="flex items-start justify-between gap-3">
            <p>
              Your ratings use the {instrument.abbreviation}, a clinically validated scale used
              worldwide. Your scores can be shared with your provider and compared to published
              research. Rate only the symptoms you experience — it&apos;s fine to leave others at
              &ldquo;none.&rdquo;
            </p>
            <button
              type="button"
              onClick={dismissTooltip}
              className="shrink-0 rounded p-1 text-sage-400 hover:bg-sage-100"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-sage-200 border-l-4 border-l-sage-500 bg-sage-50/30 px-4">
        {subscaleOrder.map((subscaleId) => {
          const subscale = instrument.subscales.find((s) => s.id === subscaleId);
          const items = itemsBySubscale.get(subscaleId) ?? [];
          if (!subscale || items.length === 0) return null;
          return (
            <div key={subscaleId} className="border-b border-sand-200/80 py-4 last:border-b-0">
              <h3 className="mb-1 text-sm font-semibold text-sage-600">
                {SUBSCALE_DISPLAY_LABELS[subscaleId] ?? subscale.label}
              </h3>
              {subscaleId === 'urogenital' && (
                <p className="mb-3 text-xs leading-relaxed text-sage-400">
                  {UROGENITAL_NORMALIZATION_COPY}
                </p>
              )}
              {subscaleId !== 'urogenital' && <div className="mb-3" />}
              {items.map((item) => {
                const storageKey = getItemStorageKey(item);
                return (
                  <SeveritySlider
                    key={item.id}
                    symptomKey={storageKey}
                    label={item.label}
                    description={item.description}
                    value={mrsScores[storageKey as keyof typeof mrsScores] ?? null}
                    onChange={(key, val) => handleScoreChange(key, val)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-sand-200 bg-white p-4">
        <InstrumentScoreBadge instrument={instrument} score={score} />
        <p className="mt-2 text-xs text-sage-400">
          Total {instrument.abbreviation}: {score.total}/{instrument.totalScoreRange[1]}
          {instrument.subscales.map((sub) => (
            <span key={sub.id}>
              {' '}
              · {sub.label} {score.subscales[sub.id]?.score ?? 0}/{sub.maxScore}
            </span>
          ))}
        </p>
        <p className="mt-2 text-xs text-sage-400">
          Scored with the {instrument.name} ({instrument.abbreviation}) — a validated scale your
          provider will recognize.
        </p>
      </div>

      {showNudge && (
        <div className="rounded-lg bg-sage-50 p-4 text-sm text-sage-600">
          You&apos;ve rated {ratedCount} of {instrument.items.length} symptoms. The more you rate,
          the better we can track patterns.{' '}
          <button
            type="button"
            onClick={() => setDismissedNudge(true)}
            className="font-medium text-sage-700 underline"
          >
            Continue anyway
          </button>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={onNext} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  );
}
