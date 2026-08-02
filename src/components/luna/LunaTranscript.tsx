import type { RefObject } from 'react';
import { Moon } from 'lucide-react';
import type {
  LunaCrisisState,
  LunaFeedbackRating,
  LunaMessage,
  LunaThread,
} from '../../types/database';
import { Button } from '../ui/Button';
import { LunaCaptureReview } from './LunaCaptureReview';

const FEEDBACK_OPTIONS: LunaFeedbackRating[] = [
  'helpful',
  'new_understanding',
  'not_helpful',
  'incorrect',
  'too_obvious',
  'missing_context',
];

function feedbackLabel(value: LunaFeedbackRating): string {
  switch (value) {
    case 'helpful': return 'Helpful';
    case 'not_helpful': return 'Not helpful';
    case 'incorrect': return 'Incorrect';
    case 'too_obvious': return 'Too obvious';
    case 'missing_context': return 'Missing context';
    case 'new_understanding': return 'Made me understand something new';
  }
}

function messageDateLabel(value: string): string {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  }).format(date);
}

function LunaSafetyPanel() {
  return (
    <div className="sticky top-0 z-10 rounded-xl border border-sage-300 bg-sand-50 p-4 shadow-sm">
      <p className="text-sm font-medium text-sage-800">Immediate support stays within reach</p>
      <p className="mt-1 text-sm leading-relaxed text-sage-600">
        If you may act now, contact local emergency services. In the US, call or text{' '}
        <a href="tel:988" className="font-medium text-sage-700 underline underline-offset-2">
          988
        </a>
        . Outside the US,{' '}
        <a
          href="https://findahelpline.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-sage-700 underline underline-offset-2"
        >
          findahelpline.com
        </a>{' '}
        lists local support.
      </p>
    </div>
  );
}

interface LunaTranscriptProps {
  loading: boolean;
  showIntro: boolean;
  thread: LunaThread | null;
  messages: LunaMessage[];
  crisisState: LunaCrisisState | null;
  sending: boolean;
  memoryProposal: string | null;
  ratedMessages: Record<string, LunaFeedbackRating>;
  messageEndRef: RefObject<HTMLDivElement | null>;
  onIntroSeen: () => void;
  onRemember: (content: string) => void;
  onDismissMemory: () => void;
  onRate: (messageId: string, rating: LunaFeedbackRating) => void;
  onManualAction: (path: string) => void;
}

export function LunaTranscript({
  loading,
  showIntro,
  thread,
  messages,
  crisisState,
  sending,
  memoryProposal,
  ratedMessages,
  messageEndRef,
  onIntroSeen,
  onRemember,
  onDismissMemory,
  onRate,
  onManualAction,
}: LunaTranscriptProps) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
      {loading && <p className="text-sm text-sage-500">Opening Luna…</p>}
      {showIntro && (
        <div className="rounded-xl border border-sage-200 bg-sage-50/50 p-4">
          <div className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-sage-600" />
            <h3 className="font-display text-lg text-sage-800">Meet Luna</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-sage-700">
            I&apos;m TrackHer&apos;s AI companion. Talk about how you feel, or ask about your data. I
            can help organize and explain what you&apos;ve tracked, but I can&apos;t diagnose you or
            tell you how to change treatment.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-sage-600">
            You don&apos;t need to phrase things perfectly. Nothing is added to your tracker until
            you review and confirm it.
          </p>
          <Button size="sm" className="mt-4" onClick={onIntroSeen}>Got it</Button>
        </div>
      )}
      {Boolean(thread?.context_data?.label) && thread?.kind !== 'dashboard' && (
        <div className="mb-4 rounded-lg bg-sand-100 px-3 py-2 text-xs text-sage-600">
          Discussing: {String(thread?.context_data.label)}
        </div>
      )}
      {crisisState && <LunaSafetyPanel />}
      <div className="mt-4 space-y-3">
        {messages.map((message, index) => {
          const prior = messages[index - 1];
          const showDate = !prior || messageDateLabel(prior.created_at) !== messageDateLabel(message.created_at);
          return (
            <div key={message.id}>
              {showDate && <p className="my-4 text-center text-xs text-sage-400">{messageDateLabel(message.created_at)}</p>}
              <div className={`flex items-start gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-600">
                    <Moon className="h-4 w-4" aria-hidden />
                  </span>
                )}
                <div className="max-w-[85%]">
                  <div className={`whitespace-pre-line rounded-xl px-3 py-2 text-sm leading-relaxed ${message.role === 'user' ? 'bg-sage-500 text-on-accent' : 'bg-sand-100 text-sage-800'}`}>
                    {message.content}
                  </div>
                  {message.role === 'user' && !message.crisis_tier && !crisisState && !(sending && index === messages.length - 1) && (
                    <>
                      <button type="button" className="mt-1 text-xs text-sage-400 underline-offset-2 hover:underline" onClick={() => onRemember(message.content)}>
                        Remember this
                      </button>
                      {thread?.kind === 'checkin' && <LunaCaptureReview text={message.content} />}
                    </>
                  )}
                  {message.role === 'assistant' && !message.crisis_tier && (
                    <select
                      aria-label="Rate Luna's reply"
                      value={ratedMessages[message.id] ?? ''}
                      className="mt-1 bg-transparent text-xs text-sage-400"
                      onChange={(event) => onRate(message.id, event.target.value as LunaFeedbackRating)}
                    >
                      <option value="">Rate this reply</option>
                      {FEEDBACK_OPTIONS.map((option) => <option key={option} value={option}>{feedbackLabel(option)}</option>)}
                    </select>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {sending && <div className="flex items-center gap-2 text-sm text-sage-500"><Moon className="h-4 w-4" />Luna is thinking…</div>}
        {memoryProposal && (
          <div className="rounded-xl border border-sage-200 bg-sage-50/40 p-3">
            <p className="text-sm text-sage-700">This seems useful for future conversations. Would you like me to remember it?</p>
            <p className="mt-2 text-sm font-medium text-sage-800">{memoryProposal}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => onRemember(memoryProposal)}>Remember it</Button>
              <Button variant="ghost" size="sm" onClick={onDismissMemory}>Not now</Button>
            </div>
          </div>
        )}
        {!crisisState && thread && (
          <div className="flex flex-wrap gap-2 pt-2" aria-label="TrackHer actions">
            {(thread.kind === 'lab' || thread.kind === 'insight') && (
              <>
                <ActionButton onClick={() => onManualAction('/labs?action=import')}>Import a lab report</ActionButton>
                <ActionButton onClick={() => onManualAction('/labs?action=add')}>Add a lab result manually</ActionButton>
              </>
            )}
            {(thread.kind === 'medication' || thread.kind === 'insight') && (
              <ActionButton onClick={() => onManualAction('/medications?action=add')}>Review a medication to add</ActionButton>
            )}
            {(thread.kind === 'checkin' || thread.kind === 'dashboard' || thread.kind === 'insight') && (
              <ActionButton onClick={() => onManualAction('/checkin?mode=quick')}>Open Check In</ActionButton>
            )}
          </div>
        )}
        <div ref={messageEndRef} />
      </div>
    </div>
  );
}

function ActionButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className="rounded-full border border-sage-200 bg-sage-50 px-3 py-1.5 text-xs font-medium text-sage-700 hover:bg-sage-100">
      {children}
    </button>
  );
}
