import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HeartHandshake, X, ClipboardCopy, Share2 } from 'lucide-react';
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
import { invokePartnerLetter } from '../../hooks/useAiAssistant';
import {
  clampPartnerLetter,
  partnerLetterCacheKey,
} from '../../utils/aiPartnerLetter';
import { useAuthStore } from '../../stores/authStore';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useVisualViewportBounds } from '../../hooks/useKeyboardBottomInset';
import { CompanionRiskNotice } from './CompanionRiskNotice';

interface PartnerLetterSheetProps {
  context: AiFactsPacketInput;
  open: boolean;
  onClose: () => void;
}

export function PartnerLetterSheet({ context, open, onClose }: PartnerLetterSheetProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const [freeText, setFreeText] = useState('');
  const [letter, setLetter] = useState<string | null>(null);
  const [riskReply, setRiskReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const { offsetTop, height: vvHeight } = useVisualViewportBounds();
  useFocusTrap(open, sheetRef, onClose);

  const facts = useMemo(() => buildAiFactsPacket(context), [context]);
  const factsHash = useMemo(() => hashAiFactsPacket(facts), [facts]);

  useEffect(() => {
    if (!open) {
      setLetter(null);
      setRiskReply(null);
      setError(null);
      setFreeText('');
      setCopied(false);
    }
  }, [open]);

  if (!open) return null;

  const generate = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    setRiskReply(null);
    const cacheHash = partnerLetterCacheKey(factsHash, freeText);
    try {
      const cached = await readAiInsightCache<{ letter?: string }>(
        userId,
        'partner_letter',
        cacheHash,
      );
      const fromCache = clampPartnerLetter(cached?.letter);
      if (fromCache) {
        setLetter(fromCache);
        setLoading(false);
        return;
      }
      const result = await invokePartnerLetter(facts, freeText.trim() || undefined);
      if (result?.riskReply) {
        // Safety screening fired on her notes: show the scripted support reply
        // instead of a letter, and never cache it.
        setLetter(null);
        setRiskReply(result.riskReply);
        setLoading(false);
        return;
      }
      const clamped = clampPartnerLetter(result?.letter ?? null);
      if (!clamped) {
        setError('Could not draft a letter right now.');
        setLoading(false);
        return;
      }
      setLetter(clamped);
      await writeAiInsightCache(userId, 'partner_letter', cacheHash, { letter: clamped }, 7);
    } catch {
      setError('Could not draft a letter right now.');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!letter) return;
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const share = async () => {
    if (!letter || !navigator.share) {
      await copy();
      return;
    }
    try {
      await navigator.share({ title: 'A note from TrackHer', text: letter });
    } catch {
      // user cancelled
    }
  };

  return createPortal(
    <div
      data-vv-frame
      className="fixed inset-x-0 z-50 overscroll-contain sm:flex sm:items-center sm:justify-center"
      style={{ top: offsetTop, height: vvHeight, touchAction: 'none' }}
    >
      <button
        type="button"
        className="absolute inset-0 bg-sage-900/40 overscroll-contain"
        aria-label="Close"
        onClick={onClose}
        style={{ touchAction: 'none' }}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="partner-letter-title"
        tabIndex={-1}

        className="absolute inset-x-0 bottom-0 z-10 mx-auto flex max-h-full w-full max-w-lg flex-col overscroll-contain rounded-t-2xl border border-sand-200 bg-sand-50 shadow-2xl outline-none sm:relative sm:bottom-auto sm:m-4 sm:max-h-[min(90%,640px)] sm:rounded-2xl"
        style={{ maxHeight: 'min(100%, 640px)', touchAction: 'pan-y' }}
      >
        <div className="safe-area-modal-header flex items-center justify-between border-b border-sand-100 pb-4">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-sage-600" />
            <h2 id="partner-letter-title" className="font-display text-lg text-sage-800">
              Letter for a loved one
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-sage-400 hover:bg-sage-50 hover:text-sage-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="safe-area-modal-body min-h-0 flex-1 space-y-4 overflow-y-auto py-4">
          <p className="text-sm leading-relaxed text-sage-600">
            A warm, plain-language note explaining what you&apos;ve been experiencing — grounded
            in your logged symptoms. Disbelief is common; your data is real.
          </p>
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            rows={3}
            placeholder="Anything you want included? (optional)"
            className="w-full rounded-lg border border-sand-200 bg-sand-50 px-3 py-2 text-base text-sage-800 placeholder:text-sage-400 focus:border-sage-400 focus:outline-none focus:ring-1 focus:ring-sage-400"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            isLoading={loading}
            loadingText="Drafting…"
            onClick={() => void generate()}
          >
            Draft letter
          </Button>
          {error && <p className="text-sm text-sage-600">{error}</p>}
          {riskReply && <CompanionRiskNotice reply={riskReply} />}
          {letter && (
            <div className="space-y-3">
              <div className="max-h-64 overflow-y-auto rounded-lg border border-sand-200 bg-white p-4 text-sm leading-relaxed text-sage-800 whitespace-pre-wrap">
                {letter}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => void copy()}>
                  <ClipboardCopy className="mr-1.5 h-4 w-4" />
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => void share()}>
                  <Share2 className="mr-1.5 h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
