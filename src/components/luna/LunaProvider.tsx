import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Brain,
  Clock3,
  Moon,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useInsights } from '../../hooks/useInsights';
import {
  invokeThreadSummary,
  localCrisisStateFromChatResult,
  useAiAssistant,
  type AiChatTurn,
} from '../../hooks/useAiAssistant';
import { buildAiFactsPacket } from '../../utils/aiFactsPacket';
import { hashAiFactsPacket } from '../../utils/aiInsightsCache';
import { hasUiFlag, setUiFlag } from '../../lib/uiState';
import { useVisualViewportBounds } from '../../hooks/useKeyboardBottomInset';
import type {
  LunaCrisisState,
  LunaFeedbackRating,
  LunaMemory,
  LunaMessage,
  LunaThread,
  LunaThreadKind,
} from '../../types/database';
import {
  addLunaMemory,
  addLunaMessage,
  clearLunaMemories,
  createFocusedLunaThread,
  deleteLunaMemory,
  deleteLunaThread,
  getOrCreateDashboardLunaThread,
  listLunaMemories,
  listLunaThreads,
  loadLunaCrisisState,
  loadLunaMessages,
  lunaPersistenceError,
  markLunaMessageCrisis,
  MemorySafetyError,
  saveLunaFeedback,
  updateLunaMemory,
  updateLunaThreadSummary,
  type LunaThreadContext,
} from '../../lib/lunaConversations';
import { Button } from '../ui/Button';
import { LunaCaptureReview } from './LunaCaptureReview';

const RECENT_TURNS = 8;
const SUMMARY_ROLL_SIZE = 4;

export interface OpenLunaRequest {
  kind: Exclude<LunaThreadKind, 'dashboard'>;
  title: string;
  context: LunaThreadContext;
  seedMessage?: string;
}

interface LunaContextValue {
  openDashboardLuna: (startFresh?: boolean) => Promise<void>;
  openLuna: (request: OpenLunaRequest) => Promise<void>;
  dashboardPreview: string | null;
  hasDashboardConversation: boolean;
}

const LunaContext = createContext<LunaContextValue | null>(null);

function sortThreads(rows: LunaThread[]): LunaThread[] {
  return [...rows].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

function feedbackLabel(value: LunaFeedbackRating): string {
  switch (value) {
    case 'helpful':
      return 'Helpful';
    case 'not_helpful':
      return 'Not helpful';
    case 'incorrect':
      return 'Incorrect';
    case 'too_obvious':
      return 'Too obvious';
    case 'missing_context':
      return 'Missing context';
    case 'new_understanding':
      return 'Made me understand something new';
  }
}

const FEEDBACK_OPTIONS: LunaFeedbackRating[] = [
  'helpful',
  'new_understanding',
  'not_helpful',
  'incorrect',
  'too_obvious',
  'missing_context',
];

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

function isCrisisShape(shape: string | undefined): LunaMessage['crisis_tier'] {
  if (
    shape === 'mental_decline' ||
    shape === 'crisis' ||
    shape === 'crisis_imminent' ||
    shape === 'loved_one'
  ) {
    return shape;
  }
  if (shape === 'loved_one_crisis') return 'loved_one';
  if (shape === 'crisis_followup_resolved') return 'crisis';
  return null;
}

function createClientRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `luna-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function mergeMessages(current: LunaMessage[], additions: LunaMessage[]): LunaMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of additions) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
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

function LunaSessionProvider({
  children,
  userId,
}: {
  children: ReactNode;
  userId: string | undefined;
}) {
  const profile = useAuthStore((s) => s.profile);
  const { aiContext } = useInsights();
  const { ask, isSending, error: assistantError, clearError } = useAiAssistant();
  const { offsetTop, height: viewportHeight } = useVisualViewportBounds();

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'history' | 'memory'>('chat');
  const [threads, setThreads] = useState<LunaThread[]>([]);
  const [thread, setThread] = useState<LunaThread | null>(null);
  const [messages, setMessages] = useState<LunaMessage[]>([]);
  const [memories, setMemories] = useState<LunaMemory[]>([]);
  const [crisisState, setCrisisState] = useState<LunaCrisisState | null>(null);
  const [input, setInput] = useState('');
  const [loadingThread, setLoadingThread] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [assistantErrorThreadId, setAssistantErrorThreadId] = useState<string | null>(null);
  const [memoryProposal, setMemoryProposal] = useState<string | null>(null);
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingMemoryText, setEditingMemoryText] = useState('');
  const [ratedMessages, setRatedMessages] = useState<Record<string, LunaFeedbackRating>>({});
  const messageEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sessionActiveRef = useRef(true);
  const selectedThreadIdRef = useRef<string | null>(null);
  const openRequestRef = useRef(0);
  const indexRequestRef = useRef(0);
  const sendRequestRef = useRef(0);
  const submitLockedRef = useRef(false);
  const summaryRequestsRef = useRef(new Map<string, number>());

  useEffect(() => {
    sessionActiveRef.current = true;
    const summaryRequests = summaryRequestsRef.current;
    return () => {
      sessionActiveRef.current = false;
      openRequestRef.current += 1;
      indexRequestRef.current += 1;
      sendRequestRef.current += 1;
      submitLockedRef.current = false;
      summaryRequests.clear();
    };
  }, []);

  const facts = useMemo(() => buildAiFactsPacket(aiContext), [aiContext]);
  const factsHash = useMemo(() => hashAiFactsPacket(facts), [facts]);
  const dashboardThread = threads.find(
    (item) => item.kind === 'dashboard' && item.is_dashboard_primary,
  );

  const refreshIndex = useCallback(async (preserveCrisisOnMissing = false) => {
    if (!userId) return;
    const requestId = ++indexRequestRef.current;
    try {
      const [threadRows, memoryRows, activeCrisis] = await Promise.all([
        listLunaThreads(userId),
        listLunaMemories(userId),
        loadLunaCrisisState(userId),
      ]);
      if (!sessionActiveRef.current || requestId !== indexRequestRef.current) return;
      setThreads(sortThreads(threadRows));
      setMemories(memoryRows);
      if (!preserveCrisisOnMissing || activeCrisis) setCrisisState(activeCrisis);
      setStorageError(null);
    } catch (loadError) {
      if (!sessionActiveRef.current || requestId !== indexRequestRef.current) return;
      setStorageError(lunaPersistenceError(loadError));
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      selectedThreadIdRef.current = null;
      setThreads([]);
      setThread(null);
      setMessages([]);
      setMemories([]);
      setCrisisState(null);
      setMemoryProposal(null);
      setRatedMessages({});
      setStorageError(null);
      setLoadingThread(false);
      clearError();
      return;
    }
    void refreshIndex();
  }, [clearError, userId, refreshIndex]);

  useEffect(() => {
    if (!open || view !== 'chat') return;
    messageEndRef.current?.scrollIntoView({ block: 'end' });
  }, [open, view, messages.length, memoryProposal]);

  const loadSelectedThread = useCallback(
    async (target: LunaThread, seedMessage: string, requestId: number) => {
      if (
        !userId ||
        !sessionActiveRef.current ||
        requestId !== openRequestRef.current
      ) {
        return;
      }
      selectedThreadIdRef.current = target.id;
      setOpen(true);
      setView('chat');
      setLoadingThread(true);
      setStorageError(null);
      setAssistantErrorThreadId(null);
      clearError();
      setMemoryProposal(null);
      setInput(seedMessage);
      setThread(target);
      setMessages([]);
      try {
        const [rows, activeCrisis] = await Promise.all([
          loadLunaMessages(userId, target.id),
          loadLunaCrisisState(userId),
        ]);
        if (
          !sessionActiveRef.current ||
          requestId !== openRequestRef.current ||
          selectedThreadIdRef.current !== target.id
        ) {
          return;
        }
        setMessages(rows);
        setCrisisState(activeCrisis);
      } catch (loadError) {
        if (
          !sessionActiveRef.current ||
          requestId !== openRequestRef.current ||
          selectedThreadIdRef.current !== target.id
        ) {
          return;
        }
        setStorageError(lunaPersistenceError(loadError));
      } finally {
        if (
          sessionActiveRef.current &&
          requestId === openRequestRef.current &&
          selectedThreadIdRef.current === target.id
        ) {
          setLoadingThread(false);
        }
      }
    },
    [clearError, userId],
  );

  const openExistingThread = useCallback(
    async (target: LunaThread, seedMessage = '') => {
      const requestId = ++openRequestRef.current;
      await loadSelectedThread(target, seedMessage, requestId);
    },
    [loadSelectedThread],
  );

  const openDashboardLuna = useCallback(
    async (startFresh = false) => {
      if (!userId) return;
      const requestId = ++openRequestRef.current;
      setOpen(true);
      setLoadingThread(true);
      setView('chat');
      setStorageError(null);
      try {
        const target = await getOrCreateDashboardLunaThread(userId, startFresh);
        if (!sessionActiveRef.current || requestId !== openRequestRef.current) return;
        await loadSelectedThread(target, '', requestId);
        if (!sessionActiveRef.current || requestId !== openRequestRef.current) return;
        await refreshIndex();
      } catch (openError) {
        if (!sessionActiveRef.current || requestId !== openRequestRef.current) return;
        setStorageError(lunaPersistenceError(openError));
        setLoadingThread(false);
      }
    },
    [loadSelectedThread, refreshIndex, userId],
  );

  const openLuna = useCallback(
    async (request: OpenLunaRequest) => {
      if (!userId) return;
      const requestId = ++openRequestRef.current;
      setOpen(true);
      setLoadingThread(true);
      setView('chat');
      setStorageError(null);
      try {
        const target = await createFocusedLunaThread(
          userId,
          request.kind,
          request.title,
          request.context,
        );
        if (!sessionActiveRef.current || requestId !== openRequestRef.current) return;
        await loadSelectedThread(target, request.seedMessage ?? '', requestId);
        if (!sessionActiveRef.current || requestId !== openRequestRef.current) return;
        await refreshIndex();
      } catch (openError) {
        if (!sessionActiveRef.current || requestId !== openRequestRef.current) return;
        setStorageError(lunaPersistenceError(openError));
        setLoadingThread(false);
      }
    },
    [loadSelectedThread, refreshIndex, userId],
  );

  const maybeRefreshSummary = useCallback(
    async (target: LunaThread, allMessages: LunaMessage[]) => {
      if (!userId || !sessionActiveRef.current || allMessages.length <= RECENT_TURNS) return;
      const olderCount = allMessages.length - RECENT_TURNS;
      if (olderCount - target.summary_message_count < SUMMARY_ROLL_SIZE) return;
      const requestId = (summaryRequestsRef.current.get(target.id) ?? 0) + 1;
      summaryRequestsRef.current.set(target.id, requestId);

      let crisisPlaceholderAdded = false;
      const summaryMessages: AiChatTurn[] = [];
      for (const item of allMessages.slice(0, olderCount)) {
        if (item.crisis_tier) {
          if (!crisisPlaceholderAdded) {
            summaryMessages.push({
              role: 'assistant',
              content: 'A supportive safety conversation occurred; sensitive details are omitted.',
            });
            crisisPlaceholderAdded = true;
          }
          continue;
        }
        summaryMessages.push({ role: item.role, content: item.content });
      }

      const summary = await invokeThreadSummary(target.summary, summaryMessages);
      if (
        !summary ||
        !sessionActiveRef.current ||
        summaryRequestsRef.current.get(target.id) !== requestId
      ) {
        return;
      }
      await updateLunaThreadSummary(userId, target.id, summary, olderCount);
      if (
        !sessionActiveRef.current ||
        summaryRequestsRef.current.get(target.id) !== requestId
      ) {
        return;
      }
      setThread((current) =>
        current?.id === target.id
          ? { ...current, summary, summary_message_count: olderCount }
          : current,
      );
      setThreads((current) =>
        current.map((item) =>
          item.id === target.id
            ? { ...item, summary, summary_message_count: olderCount }
            : item,
        ),
      );
    },
    [userId],
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !thread || !userId || submitLockedRef.current) return;

    submitLockedRef.current = true;
    const requestId = ++sendRequestRef.current;
    const clientRequestId = createClientRequestId();
    const originThread = thread;
    const originMessages = messages;
    const originMemories = memories;
    const isCurrentSession = () =>
      sessionActiveRef.current && requestId === sendRequestRef.current;
    const isOriginVisible = () =>
      isCurrentSession() && selectedThreadIdRef.current === originThread.id;
    const releaseSubmit = () => {
      if (requestId === sendRequestRef.current) submitLockedRef.current = false;
    };

    clearError();
    setStorageError(null);
    setMemoryProposal(null);
    setInput('');

    let userMessage: LunaMessage;
    try {
      userMessage = await addLunaMessage({
        userId,
        threadId: originThread.id,
        role: 'user',
        content: text,
        metadata: {
          source: originThread.kind,
          clientRequestId,
          requestPhase: 'user',
        },
      });
      if (!isCurrentSession()) {
        releaseSubmit();
        return;
      }
      if (isOriginVisible()) {
        setMessages((current) => mergeMessages(current, [userMessage]));
      }
    } catch (saveError) {
      if (isOriginVisible()) {
        setInput(text);
        setStorageError(lunaPersistenceError(saveError));
      }
      releaseSubmit();
      return;
    }

    const history: AiChatTurn[] = originMessages.slice(-RECENT_TURNS).map((item) => ({
      role: item.role,
      content: item.content,
      crisisTier: item.crisis_tier,
    }));

    let result: Awaited<ReturnType<typeof ask>>;
    try {
      result = await ask(text, facts, history, {
        threadId: originThread.id,
        threadSummary: originThread.summary,
        memories: originMemories.map((memory) => memory.content),
        pageContext: originThread.context_data,
        factsHash,
      });
    } catch (requestError) {
      if (isOriginVisible()) setStorageError(lunaPersistenceError(requestError));
      releaseSubmit();
      return;
    }

    if (!result || !isCurrentSession()) {
      if (!result && isOriginVisible()) setAssistantErrorThreadId(originThread.id);
      releaseSubmit();
      return;
    }
    setAssistantErrorThreadId(null);

    const localCrisis = localCrisisStateFromChatResult(userId, result.crisis);
    if (localCrisis) setCrisisState(localCrisis);

    const crisisTier = isCrisisShape(result.shape);
    try {
      if (crisisTier) {
        await markLunaMessageCrisis(userId, userMessage.id, crisisTier);
        if (!isCurrentSession()) return;
        userMessage = { ...userMessage, crisis_tier: crisisTier };
        if (isOriginVisible()) {
          setMessages((current) => mergeMessages(current, [userMessage]));
        }
      }

      const assistantMessage = await addLunaMessage({
        userId,
        threadId: originThread.id,
        role: 'assistant',
        content: result.reply,
        metadata: {
          clientRequestId,
          requestPhase: 'assistant',
          model: result.model ?? null,
          shape: result.shape ?? null,
          toolEvidence: result.toolEvidence ?? [],
        },
        crisisTier,
      });
      if (!isCurrentSession()) return;
      const nextMessages = mergeMessages(originMessages, [userMessage, assistantMessage]);
      if (isOriginVisible()) {
        setMessages((current) => mergeMessages(current, [userMessage, assistantMessage]));
        setMemoryProposal(result.memoryProposal?.trim() || null);
      }

      if (result.crisis) {
        const activeCrisis = await loadLunaCrisisState(userId);
        if (isCurrentSession() && activeCrisis) setCrisisState(activeCrisis);
      } else if (result.shape === 'crisis_followup_resolved') {
        setCrisisState(null);
      }

      maybeRefreshSummary(originThread, nextMessages).catch(() => {
        if (import.meta.env.DEV) console.warn('Background summary refresh failed');
      });
      void refreshIndex(Boolean(localCrisis));
    } catch (saveError) {
      if (isOriginVisible()) setStorageError(lunaPersistenceError(saveError));
    } finally {
      releaseSubmit();
    }
  }, [
    ask,
    clearError,
    facts,
    factsHash,
    input,
    memories,
    messages,
    maybeRefreshSummary,
    refreshIndex,
    thread,
    userId,
  ]);

  const remember = useCallback(
    async (content: string) => {
      if (!userId || !thread || !content.trim() || crisisState) return;
      try {
        const memory = await addLunaMemory(userId, content.slice(0, 1000), thread.id);
        setMemories((current) => [memory, ...current]);
        setMemoryProposal(null);
      } catch (saveError) {
        if (saveError instanceof MemorySafetyError) {
          setStorageError(saveError.message);
          setMemoryProposal(null);
        } else {
          setStorageError(lunaPersistenceError(saveError));
        }
      }
    },
    [crisisState, thread, userId],
  );

  const handleDeleteThread = useCallback(
    async (target: LunaThread) => {
      if (!userId) return;
      try {
        await deleteLunaThread(userId, target.id);
        if (thread?.id === target.id) {
          selectedThreadIdRef.current = null;
          openRequestRef.current += 1;
          setThread(null);
          setMessages([]);
          setView('history');
        }
        await refreshIndex();
      } catch (deleteError) {
        setStorageError(lunaPersistenceError(deleteError));
      }
    },
    [refreshIndex, thread?.id, userId],
  );

  const close = () => {
    openRequestRef.current += 1;
    setOpen(false);
    setView('chat');
    setLoadingThread(false);
    setInput('');
    setMemoryProposal(null);
    clearError();
  };

  const openManualAction = (path: string) => {
    close();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const introSeen = hasUiFlag(profile, 'luna_intro_seen');
  const showIntro = !introSeen && messages.length === 0 && !loadingThread;
  const visibleAssistantError =
    assistantErrorThreadId === thread?.id ? assistantError : null;

  const value = useMemo<LunaContextValue>(
    () => ({
      openDashboardLuna,
      openLuna,
      dashboardPreview: dashboardThread?.last_message_preview ?? null,
      hasDashboardConversation: Boolean(dashboardThread?.last_message_preview),
    }),
    [dashboardThread?.last_message_preview, openDashboardLuna, openLuna],
  );

  const panel = open
    ? createPortal(
        <div
          data-vv-frame
          className="fixed inset-x-0 z-50 flex items-stretch justify-center sm:items-center sm:p-4"
          style={{ top: offsetTop, height: viewportHeight }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close Luna"
            onClick={close}
          />
          <div className="relative z-10 flex h-full w-full flex-col overflow-hidden bg-sand-50 outline-none sm:h-[min(760px,92vh)] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-sand-200 sm:shadow-2xl">
            <header className="safe-area-modal-header flex shrink-0 items-center gap-3 border-b border-sand-200">
              {view !== 'chat' ? (
                <button
                  type="button"
                  onClick={() => setView('chat')}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-sage-500 hover:bg-sage-50"
                  aria-label="Back to Luna"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-100 text-sage-600">
                  <Moon className="h-5 w-5" aria-hidden />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-xl text-sage-800">
                  {view === 'history'
                    ? 'Recent conversations'
                    : view === 'memory'
                      ? 'What I remember'
                      : 'Luna'}
                </h2>
                {view === 'chat' && thread?.kind !== 'dashboard' && (
                  <p className="truncate text-xs text-sage-500">{thread?.title}</p>
                )}
              </div>
              {view === 'chat' && (
                <>
                  <button
                    type="button"
                    onClick={() => setView('history')}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-sage-500 hover:bg-sage-50"
                    aria-label="Recent conversations"
                  >
                    <Clock3 className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('memory')}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-sage-500 hover:bg-sage-50"
                    aria-label="What Luna remembers"
                  >
                    <Brain className="h-5 w-5" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={close}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-sage-500 hover:bg-sage-50"
                aria-label="Close Luna"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {view === 'history' ? (
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                <p className="mb-4 text-sm text-sage-500">
                  Conversations stay separate. Reopening one restores only that conversation.
                </p>
                <div className="space-y-3">
                  {threads.length === 0 && (
                    <p className="rounded-xl border border-sand-200 p-4 text-sm text-sage-500">
                      No saved conversations yet.
                    </p>
                  )}
                  {threads.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl border border-sand-200 bg-sand-50 p-3"
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => void openExistingThread(item)}
                      >
                        <p className="truncate text-sm font-medium text-sage-800">{item.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-sage-500">
                          {item.last_message_preview || 'No messages yet'}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteThread(item)}
                        className="rounded-lg p-2 text-sage-400 hover:bg-sage-50 hover:text-sage-600"
                        aria-label={`Delete ${item.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : view === 'memory' ? (
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                <p className="text-sm leading-relaxed text-sage-600">
                  I use only memories you explicitly saved or confirmed. You can change or remove
                  any of them.
                </p>
                <div className="mt-4 space-y-3">
                  {memories.length === 0 && (
                    <p className="rounded-xl border border-sand-200 p-4 text-sm text-sage-500">
                      I am not remembering any personal context yet.
                    </p>
                  )}
                  {memories.map((memory) => (
                    <div key={memory.id} className="rounded-xl border border-sand-200 p-3">
                      {editingMemoryId === memory.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingMemoryText}
                            onChange={(event) => setEditingMemoryText(event.target.value)}
                            className="w-full rounded-lg border border-sand-200 bg-sand-50 p-3 text-base text-sage-800"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                if (!userId || !editingMemoryText.trim()) return;
                                void updateLunaMemory(
                                  userId,
                                  memory.id,
                                  editingMemoryText,
                                ).then(() => {
                                  setMemories((current) =>
                                    current.map((item) =>
                                      item.id === memory.id
                                        ? { ...item, content: editingMemoryText.trim() }
                                        : item,
                                    ),
                                  );
                                  setEditingMemoryId(null);
                                }).catch((editError: unknown) => {
                                  if (editError instanceof MemorySafetyError) {
                                    setStorageError(editError.message);
                                  } else {
                                    setStorageError(lunaPersistenceError(editError));
                                  }
                                  setEditingMemoryId(null);
                                });
                              }}
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingMemoryId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <p className="min-w-0 flex-1 text-sm leading-relaxed text-sage-700">
                            {memory.content}
                          </p>
                          <button
                            type="button"
                            className="text-xs text-sage-500 underline"
                            onClick={() => {
                              setEditingMemoryId(memory.id);
                              setEditingMemoryText(memory.content);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded p-1 text-sage-400 hover:text-sage-600"
                            aria-label="Delete memory"
                            onClick={() => {
                              if (!userId) return;
                              void deleteLunaMemory(userId, memory.id).then(() =>
                                setMemories((current) =>
                                  current.filter((item) => item.id !== memory.id),
                                ),
                              );
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {memories.length > 0 && (
                  <Button
                    variant="danger"
                    size="sm"
                    className="mt-5"
                    onClick={() => {
                      if (!userId) return;
                      void clearLunaMemories(userId).then(() => setMemories([]));
                    }}
                  >
                    Clear all memories
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
                  {loadingThread && <p className="text-sm text-sage-500">Opening Luna…</p>}

                  {showIntro && (
                    <div className="rounded-xl border border-sage-200 bg-sage-50/50 p-4">
                      <div className="flex items-center gap-2">
                        <Moon className="h-5 w-5 text-sage-600" />
                        <h3 className="font-display text-lg text-sage-800">Meet Luna</h3>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-sage-700">
                        I&apos;m TrackHer&apos;s AI companion. Talk about how you feel, or ask about
                        your data. I can help organize and explain what you&apos;ve tracked, but I
                        can&apos;t diagnose you or tell you how to change treatment.
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-sage-600">
                        You don&apos;t need to phrase things perfectly. Nothing is added to your
                        tracker until you review and confirm it.
                      </p>
                      <Button
                        size="sm"
                        className="mt-4"
                        onClick={() => setUiFlag('luna_intro_seen')}
                      >
                        Got it
                      </Button>
                    </div>
                  )}

                  {Boolean(thread?.context_data?.label) && thread?.kind !== 'dashboard' && (
                    <div className="mb-4 rounded-lg bg-sand-100 px-3 py-2 text-xs text-sage-600">
                      Discussing: {String(thread?.context_data.label)}
                    </div>
                  )}

                  {crisisState && crisisState.tier !== 'mental_decline' && <LunaSafetyPanel />}

                  <div className="mt-4 space-y-3">
                    {messages.map((item, index) => {
                      const prior = messages[index - 1];
                      const showDate =
                        !prior ||
                        messageDateLabel(prior.created_at) !== messageDateLabel(item.created_at);
                      return (
                        <div key={item.id}>
                          {showDate && (
                            <p className="my-4 text-center text-xs text-sage-400">
                              {messageDateLabel(item.created_at)}
                            </p>
                          )}
                          <div
                            className={[
                              'flex items-start gap-2',
                              item.role === 'user' ? 'justify-end' : 'justify-start',
                            ].join(' ')}
                          >
                            {item.role === 'assistant' && (
                              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-600">
                                <Moon className="h-4 w-4" aria-hidden />
                              </span>
                            )}
                            <div className="max-w-[85%]">
                              <div
                                className={[
                                  'whitespace-pre-line rounded-xl px-3 py-2 text-sm leading-relaxed',
                                  item.role === 'user'
                                    ? 'bg-sage-500 text-on-accent'
                                    : 'bg-sand-100 text-sage-800',
                                ].join(' ')}
                              >
                                {item.content}
                              </div>
                              {item.role === 'user' &&
                                !item.crisis_tier &&
                                !crisisState &&
                                !(isSending && index === messages.length - 1) && (
                                <>
                                  <button
                                    type="button"
                                    className="mt-1 text-xs text-sage-400 underline-offset-2 hover:underline"
                                    onClick={() => void remember(item.content)}
                                  >
                                    Remember this
                                  </button>
                                  {thread?.kind === 'checkin' && !crisisState && (
                                    <LunaCaptureReview text={item.content} />
                                  )}
                                </>
                              )}
                              {item.role === 'assistant' && !item.crisis_tier && (
                                <select
                                  aria-label="Rate Luna's reply"
                                  value={ratedMessages[item.id] ?? ''}
                                  className="mt-1 bg-transparent text-xs text-sage-400"
                                  onChange={(event) => {
                                    const rating = event.target.value as LunaFeedbackRating;
                                    if (!rating || !userId || !thread) return;
                                    setRatedMessages((current) => ({
                                      ...current,
                                      [item.id]: rating,
                                    }));
                                    void saveLunaFeedback({
                                      userId,
                                      threadId: thread.id,
                                      messageId: item.id,
                                      rating,
                                    });
                                  }}
                                >
                                  <option value="">Rate this reply</option>
                                  {FEEDBACK_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                      {feedbackLabel(option)}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {isSending && (
                      <div className="flex items-center gap-2 text-sm text-sage-500">
                        <Moon className="h-4 w-4" />
                        Luna is thinking…
                      </div>
                    )}
                    {memoryProposal && (
                      <div className="rounded-xl border border-sage-200 bg-sage-50/40 p-3">
                        <p className="text-sm text-sage-700">
                          This seems useful for future conversations. Would you like me to remember
                          it?
                        </p>
                        <p className="mt-2 text-sm font-medium text-sage-800">{memoryProposal}</p>
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" onClick={() => void remember(memoryProposal)}>
                            Remember it
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMemoryProposal(null)}
                          >
                            Not now
                          </Button>
                        </div>
                      </div>
                    )}
                    {!crisisState && thread && (
                      <div className="flex flex-wrap gap-2 pt-2" aria-label="TrackHer actions">
                        {(thread.kind === 'lab' || thread.kind === 'insight') && (
                          <>
                            <button
                              type="button"
                              onClick={() => openManualAction('/labs?action=import')}
                              className="rounded-full border border-sage-200 bg-sage-50 px-3 py-1.5 text-xs font-medium text-sage-700 hover:bg-sage-100"
                            >
                              Import a lab report
                            </button>
                            <button
                              type="button"
                              onClick={() => openManualAction('/labs?action=add')}
                              className="rounded-full border border-sage-200 bg-sage-50 px-3 py-1.5 text-xs font-medium text-sage-700 hover:bg-sage-100"
                            >
                              Add a lab result manually
                            </button>
                          </>
                        )}
                        {(thread.kind === 'medication' || thread.kind === 'insight') && (
                          <button
                            type="button"
                            onClick={() => openManualAction('/medications?action=add')}
                            className="rounded-full border border-sage-200 bg-sage-50 px-3 py-1.5 text-xs font-medium text-sage-700 hover:bg-sage-100"
                          >
                            Review a medication to add
                          </button>
                        )}
                        {(thread.kind === 'checkin' || thread.kind === 'dashboard' || thread.kind === 'insight') && (
                          <button
                            type="button"
                            onClick={() => openManualAction('/checkin?mode=quick')}
                            className="rounded-full border border-sage-200 bg-sage-50 px-3 py-1.5 text-xs font-medium text-sage-700 hover:bg-sage-100"
                          >
                            Open Check In
                          </button>
                        )}
                      </div>
                    )}
                    <div ref={messageEndRef} />
                  </div>
                </div>

                <div className="shrink-0 border-t border-sand-200 bg-sand-50 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
                  {(storageError || visibleAssistantError) && (
                    <p className="mb-2 text-sm text-sage-600">
                      {storageError ??
                        (visibleAssistantError?.includes('OPENAI')
                          ? 'Luna is not configured yet.'
                          : visibleAssistantError)}
                    </p>
                  )}
                  {thread?.kind === 'dashboard' && messages.length > 0 && (
                    <button
                      type="button"
                      className="mb-2 inline-flex items-center gap-1 text-xs text-sage-500 underline-offset-2 hover:underline"
                      onClick={() => void openDashboardLuna(true)}
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
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          void send();
                        }
                      }}
                      placeholder="Tell Luna what’s going on…"
                      className="max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-sand-200 bg-sand-50 px-3 py-2.5 text-base text-sage-800 placeholder:text-sage-400 focus:border-sage-400 focus:outline-none focus:ring-1 focus:ring-sage-400"
                      disabled={!thread || loadingThread || isSending}
                    />
                    <button
                      type="button"
                      onClick={() => void send()}
                      disabled={!input.trim() || !thread || loadingThread || isSending}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sage-500 text-on-accent disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Send to Luna"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <LunaContext.Provider value={value}>
      {children}
      {panel}
    </LunaContext.Provider>
  );
}

export function useLuna(): LunaContextValue {
  const context = useContext(LunaContext);
  if (!context) throw new Error('useLuna must be used within LunaProvider');
  return context;
}

export function LunaProvider({ children }: { children: ReactNode }) {
  const userId = useAuthStore((state) => state.user?.id);
  return (
    <LunaSessionProvider key={userId ?? 'signed-out'} userId={userId}>
      {children}
    </LunaSessionProvider>
  );
}
