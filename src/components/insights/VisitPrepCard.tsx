import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ClipboardCopy, CalendarHeart } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  buildAiFactsPacket,
  type AiFactsPacketInput,
} from '../../utils/aiFactsPacket';
import {
  hashAiFactsPacket,
  readAiInsightCache,
  writeAiInsightCache,
} from '../../utils/aiInsightsCache';
import { invokeVisitDebrief, invokeVisitPrep } from '../../hooks/useAiAssistant';
import {
  clampVisitPrepPack,
  formatVisitPrepForCopy,
  type VisitPrepPack,
} from '../../utils/aiVisitPrep';
import {
  writeVisitDebriefToStorage,
  readVisitDebriefFromStorage,
  type VisitDebriefPack,
} from '../../utils/aiVisitDebrief';
import { useAuthStore } from '../../stores/authStore';
import { VisitDebriefCard } from './VisitDebriefCard';

interface VisitPrepCardProps {
  context: AiFactsPacketInput;
}

/**
 * Collapsed appointment-prep pack — anti-gaslighting companion card on Insights.
 * Also hosts visit debrief paste → localStorage checklist.
 */
export function VisitPrepCard({ context }: VisitPrepCardProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const [expanded, setExpanded] = useState(false);
  const [pack, setPack] = useState<VisitPrepPack | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [debriefOpen, setDebriefOpen] = useState(false);
  const [debriefText, setDebriefText] = useState('');
  const [debriefLoading, setDebriefLoading] = useState(false);
  const [debriefError, setDebriefError] = useState<string | null>(null);
  const [debriefPack, setDebriefPack] = useState<VisitDebriefPack | null>(() =>
    typeof window !== 'undefined' ? readVisitDebriefFromStorage() : null,
  );

  const facts = useMemo(() => buildAiFactsPacket(context), [context]);
  const dataHash = useMemo(() => hashAiFactsPacket(facts), [facts]);
  const thin = facts.mrs.length < 1 && facts.pulseRecent.daysSampled < 1 && facts.medications.length < 1;

  const loadPack = useCallback(async () => {
    if (!userId || thin) return;
    setLoading(true);
    setError(null);
    try {
      const cached = await readAiInsightCache<VisitPrepPack>(userId, 'visit_prep', dataHash);
      if (cached) {
        const clamped = clampVisitPrepPack(cached);
        if (clamped) {
          setPack(clamped);
          setLoading(false);
          return;
        }
      }
      const result = await invokeVisitPrep(facts);
      if (!result) {
        setError('Could not prepare your visit pack right now.');
        setLoading(false);
        return;
      }
      setPack(result);
      await writeAiInsightCache(userId, 'visit_prep', dataHash, result, 7);
    } catch {
      setError('Could not prepare your visit pack right now.');
    } finally {
      setLoading(false);
    }
  }, [userId, thin, dataHash, facts]);

  useEffect(() => {
    if (!expanded || pack || loading) return;
    void loadPack();
  }, [expanded, pack, loading, loadPack]);

  const onCopy = async () => {
    if (!pack) return;
    try {
      await navigator.clipboard.writeText(formatVisitPrepForCopy(pack));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const onDebrief = async () => {
    const text = debriefText.trim();
    if (!text) {
      setDebriefError('Paste what your clinician said or decided first.');
      return;
    }
    setDebriefLoading(true);
    setDebriefError(null);
    const result = await invokeVisitDebrief(text, facts);
    setDebriefLoading(false);
    if (!result) {
      setDebriefError('Could not turn that into a plan right now.');
      return;
    }
    writeVisitDebriefToStorage(result);
    setDebriefPack(result);
    setDebriefOpen(false);
    setDebriefText('');
  };

  if (thin && !debriefPack) return null;

  return (
    <div className="space-y-4">
      {!thin && (
        <Card variant="outlined" padding="md" className="border-sage-200">
          <button
            type="button"
            className="flex w-full items-start gap-3 text-left"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            <div className="mt-0.5 rounded-lg bg-sand-100 p-2 text-sage-600">
              <CalendarHeart className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-sage-500">
                Visit prep
              </p>
              <p className="mt-1 text-sm font-medium text-sage-800">
                Preparing for an appointment?
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-sage-600">
                A short pack of what to raise — grounded in your logs, not debate.
              </p>
            </div>
            {expanded ? (
              <ChevronUp className="mt-1 h-5 w-5 shrink-0 text-sage-400" />
            ) : (
              <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-sage-400" />
            )}
          </button>

          {expanded && (
            <div className="mt-4 space-y-4 border-t border-sand-100 pt-4">
              {loading && (
                <p className="text-sm text-sage-500">Gathering your recent story…</p>
              )}
              {error && <p className="text-sm text-sage-600">{error}</p>}
              {pack && !loading && (
                <>
                  <p className="text-sm leading-relaxed text-sage-700">{pack.summary}</p>

                  {pack.symptomsToRaise.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-sage-500">
                        Symptoms to raise
                      </p>
                      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-sage-700">
                        {pack.symptomsToRaise.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {pack.questions.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-sage-500">
                        Questions for your clinician
                      </p>
                      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-sage-700">
                        {pack.questions.map((q) => (
                          <li key={q}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {pack.watchSince && (
                    <p className="rounded-lg bg-sand-50 px-3 py-2 text-sm leading-relaxed text-sage-600">
                      {pack.watchSince}
                    </p>
                  )}

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void onCopy()}
                    className="gap-2"
                  >
                    <ClipboardCopy className="h-4 w-4" />
                    {copied ? 'Copied' : 'Copy all'}
                  </Button>
                </>
              )}

              <div className="border-t border-sand-100 pt-4">
                {!debriefOpen ? (
                  <button
                    type="button"
                    className="text-sm text-sage-500 underline hover:text-sage-700"
                    onClick={() => setDebriefOpen(true)}
                  >
                    Just had your appointment?
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-sage-700">
                      Paste what your clinician said or decided — we&apos;ll turn it into a soft
                      checklist.
                    </p>
                    <textarea
                      value={debriefText}
                      onChange={(e) => setDebriefText(e.target.value)}
                      rows={4}
                      placeholder="e.g. Stay on current dose, recheck labs in 6 weeks…"
                      className="w-full rounded-lg border border-sand-200 bg-sand-50 px-3 py-2 text-base text-sage-800 placeholder:text-sage-400 focus:border-sage-400 focus:outline-none focus:ring-1 focus:ring-sage-400"
                    />
                    {debriefError && (
                      <p className="text-sm text-sage-600">{debriefError}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        isLoading={debriefLoading}
                        loadingText="Reading…"
                        disabled={!debriefText.trim() || debriefLoading}
                        onClick={() => void onDebrief()}
                      >
                        Make my checklist
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDebriefOpen(false);
                          setDebriefText('');
                          setDebriefError(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {debriefPack && (
        <VisitDebriefCard pack={debriefPack} onCleared={() => setDebriefPack(null)} />
      )}
    </div>
  );
}
