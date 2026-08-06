import { useState } from 'react';
import { Moon, X } from 'lucide-react';
import type { LunaFeedbackRating } from '../../types/database';
import type { LunaSynthesisCandidate } from '../../hooks/useAiInsightLayer';
import { useAuthStore } from '../../stores/authStore';
import { saveLunaFeedback } from '../../lib/lunaConversations';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface LunaSynthesisListProps {
  candidates: LunaSynthesisCandidate[];
  insufficient?: { title: string; body: string } | null;
  monitorNote?: { note?: string; gapHint?: string | null } | null;
  isLoading?: boolean;
  synthesisError?: string | null;
  onRetry?: () => void;
  onAsk: (candidate: LunaSynthesisCandidate) => void;
  onAskInsufficient?: () => void;
  onDismiss?: (id: string) => void;
}

const feedbackOptions: Array<{ value: LunaFeedbackRating; label: string }> = [
  { value: 'helpful', label: 'Helpful' },
  { value: 'new_understanding', label: 'Made me understand something new' },
  { value: 'not_helpful', label: 'Not helpful' },
  { value: 'incorrect', label: 'Incorrect' },
  { value: 'too_obvious', label: 'Too obvious' },
  { value: 'missing_context', label: 'Missing context' },
];

export function LunaSynthesisList({
  candidates,
  insufficient,
  monitorNote,
  isLoading = false,
  synthesisError = null,
  onRetry,
  onAsk,
  onAskInsufficient,
  onDismiss,
}: LunaSynthesisListProps) {
  const userId = useAuthStore((state) => state.user?.id);
  const [ratings, setRatings] = useState<Record<string, LunaFeedbackRating>>({});
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  return (
    <section aria-labelledby="luna-synthesis-heading" className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-600">
          <Moon className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 id="luna-synthesis-heading" className="font-display text-2xl text-sage-800">
            Luna connects the dots
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-sage-500">
            Luna investigates possible connections, while TrackHer calculates the evidence behind
            every finding.
          </p>
        </div>
      </div>

      {monitorNote?.note && (
        <div className="rounded-xl border border-sand-200 bg-sage-50/30 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-sage-500">
            Since your latest check-in
          </p>
          <p className="mt-1 text-sm leading-relaxed text-sage-700">{monitorNote.note}</p>
          {monitorNote.gapHint && (
            <p className="mt-2 text-sm leading-relaxed text-sage-600">{monitorNote.gapHint}</p>
          )}
        </div>
      )}

      {isLoading && candidates.length === 0 && (
        <div className="rounded-xl border border-sand-200 px-4 py-5 text-sm text-sage-500">
          Luna is checking which possible connections have enough evidence…
        </div>
      )}

      {!isLoading && synthesisError && candidates.length === 0 && !insufficient && (
        <div className="rounded-xl border border-sand-200 px-4 py-5">
          <p className="text-sm leading-relaxed text-sage-600">{synthesisError}</p>
          {onRetry && (
            <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      )}

      {feedbackError && (
        <p className="text-sm text-sage-600" role="alert">
          {feedbackError}
        </p>
      )}

      {!isLoading && candidates.length === 0 && insufficient && (
        <Card variant="outlined" padding="md">
          <h3 className="font-display text-lg text-sage-800">{insufficient.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-sage-600">{insufficient.body}</p>
          {onAskInsufficient && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 px-0 text-sage-600"
              onClick={onAskInsufficient}
            >
              <Moon className="h-4 w-4" aria-hidden />
              Ask Luna what information would help
            </Button>
          )}
        </Card>
      )}

      {candidates.map((candidate) => (
        <Card key={candidate.id} variant="elevated" padding="md" className="relative">
          {onDismiss && (
            <button
              type="button"
              onClick={() => onDismiss(candidate.id)}
              className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full text-sage-400 hover:bg-sage-50 hover:text-sage-600"
              aria-label="Dismiss this Luna finding"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <div className="pr-7">
            <p className="text-xs font-medium uppercase tracking-wide text-sage-500">
              {candidate.strength}
            </p>
            <h3 className="mt-1 font-display text-lg text-sage-800">{candidate.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-sage-700">{candidate.body}</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-sage-50/50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-sage-500">
                  Why it may matter
                </p>
                <p className="mt-1 text-sm leading-relaxed text-sage-700">
                  {candidate.whyItMatters}
                </p>
              </div>
              <div className="rounded-lg bg-sand-100/70 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-sage-500">
                  Limits and other explanations
                </p>
                <p className="mt-1 text-sm leading-relaxed text-sage-600">
                  {candidate.limitations}
                </p>
              </div>
            </div>

            {candidate.citedFacts.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-sage-600">
                  Evidence used
                </summary>
                <ul className="mt-2 space-y-1 pl-5 text-xs leading-relaxed text-sage-500">
                  {candidate.citedFacts.map((fact) => (
                    <li key={fact} className="list-disc">
                      {fact}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="px-0 text-sage-600"
                onClick={() => onAsk(candidate)}
              >
                <Moon className="h-4 w-4" aria-hidden />
                Ask Luna about this
              </Button>
              <select
                aria-label="Rate this Luna finding"
                value={ratings[candidate.id] ?? ''}
                className="bg-transparent text-xs text-sage-500"
                onChange={(event) => {
                  const rating = event.target.value as LunaFeedbackRating;
                  if (!rating || !userId) return;
                  const previous = ratings[candidate.id];
                  setRatings((current) => ({ ...current, [candidate.id]: rating }));
                  setFeedbackError(null);
                  void saveLunaFeedback({
                    userId,
                    insightKey: candidate.id,
                    rating,
                  }).catch(() => {
                    setRatings((current) => {
                      const next = { ...current };
                      if (previous) next[candidate.id] = previous;
                      else delete next[candidate.id];
                      return next;
                    });
                    setFeedbackError('Luna could not save that rating. Please try again.');
                  });
                }}
              >
                <option value="">Rate this finding</option>
                {feedbackOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      ))}
    </section>
  );
}
