import { Sparkles } from 'lucide-react';
import type { AiNoticedCandidate } from '../../hooks/useAiInsightLayer';
import { Card } from '../ui/Card';

interface AiNoticedListProps {
  candidates: AiNoticedCandidate[];
  onTalkAbout?: (candidate: AiNoticedCandidate) => void;
}

/** Soft companion observations — clearly labeled, not engine clinical cards. */
export function AiNoticedList({ candidates, onTalkAbout }: AiNoticedListProps) {
  if (candidates.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-xl text-sage-800">AI noticed</h2>
        <p className="mt-1 text-sm text-sage-500">
          Gentle observations from your logs — not clinical findings. Your pattern engine stays
          the source of truth.
        </p>
      </div>
      {candidates.map((c) => (
        <Card key={c.id} variant="outlined" padding="md" className="border-dashed border-sage-300">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-sand-100 p-2 text-sage-500">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-sage-400">
                Companion observation
              </p>
              <h3 className="mt-1 font-display text-base text-sage-800">{c.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-sage-600">{c.body}</p>
              {c.citedFacts.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-xs text-sage-400">
                  {c.citedFacts.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
              )}
              {onTalkAbout && (
                <button
                  type="button"
                  className="mt-3 text-sm font-medium text-sage-600 underline-offset-2 hover:underline"
                  onClick={() => onTalkAbout(c)}
                >
                  Talk about this
                </button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </section>
  );
}
