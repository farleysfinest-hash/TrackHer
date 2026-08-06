import type { RefObject } from 'react';
import { Plus, Send } from 'lucide-react';
import type { LunaThread } from '../../types/database';
import { useVisualViewportBounds } from '../../hooks/useKeyboardBottomInset';

interface LunaComposerProps {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  input: string;
  setInput: (value: string) => void;
  thread: LunaThread | null;
  messageCount: number;
  loading: boolean;
  sending: boolean;
  storageError: string | null;
  assistantError: string | null;
  onSend: () => void;
  onStartFresh: () => void;
}

export function LunaComposer({
  inputRef,
  input,
  setInput,
  thread,
  messageCount,
  loading,
  sending,
  storageError,
  assistantError,
  onSend,
  onStartFresh,
}: LunaComposerProps) {
  const { inset: keyboardInset } = useVisualViewportBounds();
  const keyboardOpen = keyboardInset > 0;

  return (
    <div
      className={[
        'shrink-0 border-t border-sand-200 bg-sand-50 px-4 py-3 sm:px-6',
        keyboardOpen ? 'pb-1' : 'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
      ].join(' ')}
    >
      {(storageError || assistantError) && (
        <p className="mb-2 text-sm text-sage-600">
          {storageError ??
            (assistantError?.includes('OPENAI')
              ? 'Luna is not configured yet.'
              : assistantError?.includes('non-2xx') || assistantError?.includes('Edge Function')
                ? 'Luna is temporarily unavailable — please try again in a moment.'
                : assistantError)}
        </p>
      )}
      {thread?.kind === 'dashboard' && messageCount > 0 && (
        <button
          type="button"
          className="mb-2 inline-flex items-center gap-1 text-xs text-sage-500 underline-offset-2 hover:underline"
          onClick={onStartFresh}
        >
          <Plus className="h-3.5 w-3.5" />
          Start fresh
        </button>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          maxLength={4000}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
          placeholder="Tell Luna what’s going on…"
          className="max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-sand-200 bg-sand-50 px-3 py-2.5 text-base text-sage-800 placeholder:text-sage-400 focus:border-sage-400 focus:outline-none focus:ring-1 focus:ring-sage-400"
          disabled={!thread || loading || sending}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!input.trim() || !thread || loading || sending}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sage-500 text-on-accent disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Send to Luna"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
