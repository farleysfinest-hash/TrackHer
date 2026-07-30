import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAiAssistant, type AiChatTurn } from '../../hooks/useAiAssistant';
import {
  buildAiFactsPacket,
  type AiFactsPacketInput,
} from '../../utils/aiFactsPacket';
import type { Insight } from '../../engine/types';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useVisualViewportBounds } from '../../hooks/useKeyboardBottomInset';

export interface AskDataSeed {
  message?: string;
  insight?: Pick<Insight, 'id' | 'title' | 'body' | 'category'>;
  /** Soft AI-noticed title/body when explaining a candidate. */
  noticed?: { title: string; body: string };
}

interface AskDataSheetProps {
  context: AiFactsPacketInput;
  seed?: AskDataSeed | null;
  onSeedConsumed?: () => void;
  /** Hide the launcher button when parent opens via seed only. */
  hideLauncher?: boolean;
}

function seedToPrefill(seed: AskDataSeed): string {
  if (seed.message?.trim()) return seed.message.trim();
  if (seed.insight) {
    return `Can you talk me through this insight: “${seed.insight.title}”?`;
  }
  if (seed.noticed) {
    return `Can you talk about this observation: “${seed.noticed.title}”?`;
  }
  return '';
}

/**
 * Companion chat. Opening "Ask about your data" is always a blank slate.
 * "Talk about this" only prefills the input — it does not auto-send.
 */
export function AskDataSheet({
  context,
  seed = null,
  onSeedConsumed,
  hideLauncher = false,
}: AskDataSheetProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<AiChatTurn[]>([]);
  const { ask, explain, isSending, error, clearError } = useAiAssistant();
  const seedHandled = useRef<string | null>(null);
  /** When set, the next Send uses explain_insight instead of free chat. */
  const pendingInsightRef = useRef<AskDataSeed['insight'] | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { offsetTop, height: vvHeight, inset: keyboardInset } = useVisualViewportBounds();

  const facts = useMemo(() => buildAiFactsPacket(context), [context]);
  const thinData = facts.mrs.length < 1 && facts.engineInsights.length === 0;

  const resetChat = () => {
    setTurns([]);
    setInput('');
    clearError();
    pendingInsightRef.current = null;
  };

  const openFresh = () => {
    resetChat();
    setOpen(true);
  };

  const closeSheet = () => {
    setOpen(false);
    resetChat();
    seedHandled.current = null;
  };

  useFocusTrap(open, sheetRef, closeSheet);

  // Talk about this / AI noticed: open sheet and prefill only — never auto-send.
  useEffect(() => {
    if (!seed) return;
    const key = JSON.stringify(seed);
    if (seedHandled.current === key) return;
    seedHandled.current = key;

    resetChat();
    const prefill = seedToPrefill(seed);
    setInput(prefill);
    pendingInsightRef.current = seed.insight ?? null;
    setOpen(true);
    onSeedConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to new seed payloads
  }, [seed]);

  // Keep the composer above the keyboard when it opens.
  useEffect(() => {
    if (!open || keyboardInset <= 0) return;
    inputRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [open, keyboardInset]);

  const send = async () => {
    const message = input.trim();
    if (!message || isSending) return;
    clearError();
    setInput('');
    setTurns((prev) => [...prev, { role: 'user', content: message }]);

    const insight = pendingInsightRef.current;
    pendingInsightRef.current = null;

    const result = insight
      ? await explain(facts, {
          id: insight.id,
          title: insight.title,
          body: insight.body,
          category: String(insight.category),
        })
      : await ask(message, facts, turns.slice(-6));

    if (result) {
      setTurns((prev) => [...prev, { role: 'assistant', content: result.reply }]);
    }
  };

  const sheet = open
    ? createPortal(
        <div
          data-vv-frame
          className="fixed inset-x-0 z-50 sm:flex sm:items-center sm:justify-center"
          style={{ top: offsetTop, height: vvHeight }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={closeSheet}
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ask-data-title"
            tabIndex={-1}

            className="absolute inset-x-0 bottom-0 z-10 mx-auto flex max-h-full w-full max-w-lg flex-col rounded-t-2xl border border-sand-200 bg-sand-50 shadow-2xl outline-none sm:relative sm:bottom-auto sm:m-4 sm:max-h-[min(90%,640px)] sm:rounded-2xl"
            style={{ maxHeight: 'min(100%, 640px)' }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-sand-100 px-5 py-4">
              <h2 id="ask-data-title" className="font-display text-lg text-sage-800">
                Ask about your data
              </h2>
              <button
                type="button"
                onClick={closeSheet}
                className="rounded-lg p-2 text-sage-400 hover:bg-sage-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-4">
              <p className="text-xs leading-relaxed text-sage-500">
                Answers use your logged TrackHer data only — not medical advice.
              </p>
              {thinData && (
                <p className="rounded-lg bg-sand-100 px-3 py-2 text-sm text-sage-600">
                  Your history is still light. More weekly check-ins will make answers sharper.
                </p>
              )}
              {turns.length === 0 && (
                <div className="space-y-2">
                  {[
                    'What’s stood out in how I’ve been feeling lately?',
                    'Has my sleep or energy shifted with my symptoms?',
                    'Help me put words to what I’d tell my doctor.',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="block w-full rounded-lg border border-sand-200 px-3 py-2 text-left text-sm text-sage-700 hover:bg-sage-50"
                      onClick={() => {
                        pendingInsightRef.current = null;
                        setInput(suggestion);
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              {turns.map((turn, i) => (
                <div
                  key={`${turn.role}-${i}`}
                  className={[
                    'rounded-xl px-3 py-2 text-sm leading-relaxed',
                    turn.role === 'user'
                      ? 'ml-8 bg-sage-500 text-on-accent'
                      : 'mr-4 bg-sand-100 text-sage-800',
                  ].join(' ')}
                >
                  {turn.content}
                </div>
              ))}
              {error && (
                <p className="text-sm text-sage-600">
                  {error.includes('OPENAI') || error.includes('not set')
                    ? 'Assistant is not configured yet — add OPENAI_API_KEY to Supabase Edge secrets.'
                    : error}
                </p>
              )}
            </div>

            <div className="shrink-0 border-t border-sand-100 bg-sand-50 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => {
                    window.setTimeout(() => {
                      inputRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    }, 50);
                    window.setTimeout(() => {
                      inputRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    }, 320);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void send();
                  }}
                  placeholder="Ask a question…"
                  className="min-w-0 flex-1 rounded-lg border border-sand-200 px-3 py-2 text-base text-sage-800 placeholder:text-sage-400 focus:border-sage-400 focus:outline-none focus:ring-1 focus:ring-sage-400"
                  disabled={isSending}
                />
                <Button
                  type="button"
                  onClick={() => void send()}
                  disabled={isSending || !input.trim()}
                >
                  {isSending ? '…' : 'Send'}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      {!hideLauncher && (
        <button
          type="button"
          onClick={openFresh}
          className="flex w-full items-center gap-3 rounded-xl border border-sand-200 bg-sand-50 px-4 py-3 text-left transition-colors hover:border-sage-300 hover:bg-sage-50/40"
        >
          <MessageCircle className="h-5 w-5 shrink-0 text-sage-500" />
          <div>
            <p className="text-sm font-medium text-sage-800">Ask about your data</p>
            <p className="text-xs text-sage-500">
              A gentle companion grounded in your check-ins, meds, and labs
            </p>
          </div>
        </button>
      )}
      {sheet}
    </>
  );
}
