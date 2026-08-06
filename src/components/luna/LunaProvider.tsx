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
  X,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useInsights } from '../../hooks/useInsights';
import {
  invokeThreadSummary,
  useAiAssistant,
  type AiChatTurn,
} from '../../hooks/useAiAssistant';
import { buildAiFactsPacket } from '../../utils/aiFactsPacket';
import { hashAiFactsPacket } from '../../utils/aiInsightsCache';
import { hasUiFlag, setUiFlag } from '../../lib/uiState';
import { useVisualViewportBounds } from '../../hooks/useKeyboardBottomInset';
import { useFocusTrap } from '../../hooks/useFocusTrap';
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
  deleteLunaThread,
  getOrCreateDashboardLunaThread,
  getOrCreateFocusedLunaThread,
  listLunaMemories,
  listLunaThreads,
  loadLunaMessages,
  lunaPersistenceError,
  markLunaMessageCrisis,
  MemorySafetyError,
  saveLunaFeedback,
  updateLunaThreadSummary,
  type LunaThreadContext,
} from '../../lib/lunaConversations';
import { LunaComposer } from './LunaComposer';
import { LunaHistoryView } from './LunaHistoryView';
import { LunaMemoryView } from './LunaMemoryView';
import { LunaTranscript } from './LunaTranscript';

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

function isCrisisShape(shape: string | undefined): LunaMessage['crisis_tier'] {
  if (
    shape === 'crisis' ||
    shape === 'crisis_imminent' ||
    shape === 'loved_one'
  ) {
    return shape;
  }
  if (shape === 'loved_one_crisis') return 'loved_one';
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

function LunaSessionProvider({
  children,
  userId,
}: {
  children: ReactNode;
  userId: string | undefined;
}) {
  const profile = useAuthStore((s) => s.profile);
  const { aiContext } = useInsights();
  const { ask, error: assistantError, clearError } = useAiAssistant();
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
  const [ratedMessages, setRatedMessages] = useState<Record<string, LunaFeedbackRating>>({});
  const messageEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const sessionActiveRef = useRef(true);
  const selectedThreadIdRef = useRef<string | null>(null);
  const openRequestRef = useRef(0);
  const indexRequestRef = useRef(0);
  const sendRequestRef = useRef(0);
  const submitLockedRef = useRef(false);
  const [sendInFlight, setSendInFlight] = useState(false);
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
      setSendInFlight(false);
      summaryRequests.clear();
    };
  }, []);

  const facts = useMemo(() => buildAiFactsPacket(aiContext), [aiContext]);
  const factsHash = useMemo(() => hashAiFactsPacket(facts), [facts]);
  const dashboardThread = threads.find(
    (item) => item.kind === 'dashboard' && item.is_dashboard_primary,
  );

  const refreshIndex = useCallback(async () => {
    if (!userId) return;
    const requestId = ++indexRequestRef.current;
    try {
      const threadRows = await listLunaThreads(userId);
      if (!sessionActiveRef.current || requestId !== indexRequestRef.current) return;
      setThreads(sortThreads(threadRows));
      setStorageError(null);
    } catch (loadError) {
      if (!sessionActiveRef.current || requestId !== indexRequestRef.current) return;
      setStorageError(lunaPersistenceError(loadError));
    }
  }, [userId]);

  // Memories are loaded once on mount and updated locally by add/edit/delete.
  // No need to re-fetch from DB on every send — mutations already update React state.
  const memoriesLoadedRef = useRef(false);
  useEffect(() => {
    if (!userId || memoriesLoadedRef.current) return;
    memoriesLoadedRef.current = true;
    listLunaMemories(userId)
      .then((rows) => {
        if (sessionActiveRef.current) setMemories(rows);
      })
      .catch((err) => {
        if (sessionActiveRef.current) setStorageError(lunaPersistenceError(err));
      });
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      selectedThreadIdRef.current = null;
      memoriesLoadedRef.current = false;
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

  useEffect(() => {
    if (view !== 'chat') return;
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
  }, [input, view]);

  const beginOpen = useCallback((requestId: number) => {
    selectedThreadIdRef.current = null;
    setOpen(true);
    setLoadingThread(true);
    setView('chat');
    setStorageError(null);
    setAssistantErrorThreadId(null);
    clearError();
    setMemoryProposal(null);
    setThread(null);
    setMessages([]);
    setRatedMessages({});
    return requestId;
  }, [clearError]);

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
        const rows = await loadLunaMessages(userId, target.id);
        if (
          !sessionActiveRef.current ||
          requestId !== openRequestRef.current ||
          selectedThreadIdRef.current !== target.id
        ) {
          return;
        }
        setMessages(rows);
        setCrisisState(null);
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
      const requestId = beginOpen(++openRequestRef.current);
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
    [beginOpen, loadSelectedThread, refreshIndex, userId],
  );

  const openLuna = useCallback(
    async (request: OpenLunaRequest) => {
      if (!userId) return;
      const requestId = beginOpen(++openRequestRef.current);
      try {
        const target = await getOrCreateFocusedLunaThread(
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
    [beginOpen, loadSelectedThread, refreshIndex, userId],
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
    setSendInFlight(true);
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
      if (requestId === sendRequestRef.current) {
        submitLockedRef.current = false;
        setSendInFlight(false);
      }
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

    const crisisTier = isCrisisShape(result.shape);

    // Crisis state comes purely from the Edge response — no persistent DB state.
    if (result.crisis?.showSafetyPanel) {
      setCrisisState({
        user_id: userId,
        tier: crisisTier ?? 'crisis',
        response_count: 1,
        presented_actions: ['support_panel'],
        asked_questions: [],
        escalated: false,
        last_activity_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3600_000).toISOString(),
      });
    }
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

      maybeRefreshSummary(originThread, nextMessages).catch(() => {
        if (import.meta.env.DEV) console.warn('Background summary refresh failed');
      });
      void refreshIndex();
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

  useFocusTrap(open, panelRef, close);

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
          className="fixed inset-x-0 z-[55] flex items-stretch justify-center overscroll-contain sm:items-center sm:p-4"
          style={{ top: offsetTop, height: viewportHeight, touchAction: 'none' }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close Luna"
            onClick={close}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="luna-panel-title"
            tabIndex={-1}
            className="relative z-10 flex h-full w-full flex-col overflow-hidden overscroll-contain bg-sand-50 outline-none sm:h-[min(760px,92vh)] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-sand-200 sm:shadow-2xl"
            style={{ touchAction: 'pan-y' }}
          >
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
                <h2 id="luna-panel-title" className="truncate font-display text-xl text-sage-800">
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
              <LunaHistoryView
                threads={threads}
                storageError={storageError}
                onOpen={(item) => void openExistingThread(item)}
                onDelete={(item) => void handleDeleteThread(item)}
              />
            ) : view === 'memory' ? (
              <LunaMemoryView
                userId={userId}
                memories={memories}
                storageError={storageError}
                setMemories={setMemories}
                onError={setStorageError}
              />
            ) : (
              <>
                <LunaTranscript
                  loading={loadingThread}
                  showIntro={showIntro}
                  thread={thread}
                  messages={messages}
                  crisisState={crisisState}
                  sending={sendInFlight}
                  memoryProposal={memoryProposal}
                  ratedMessages={ratedMessages}
                  messageEndRef={messageEndRef}
                  onIntroSeen={() => setUiFlag('luna_intro_seen')}
                  onRemember={(content) => void remember(content)}
                  onDismissMemory={() => setMemoryProposal(null)}
                  onDismissCrisis={() => {
                    setCrisisState(null);
                  }}
                  onRate={(messageId, rating) => {
                    if (!rating || !userId || !thread) return;
                    setRatedMessages((current) => ({ ...current, [messageId]: rating }));
                    // Episode reset only — clears a false-alarm panel. Clear SI tomorrow
                    // (e.g. a plan or means) still opens crisis support again.
                    if (rating === 'false_crisis_perception') {
                      setCrisisState(null);
                    }
                    void saveLunaFeedback({
                      userId,
                      threadId: thread.id,
                      messageId,
                      rating,
                    }).catch((feedbackError: unknown) => {
                      setStorageError(lunaPersistenceError(feedbackError));
                    });
                  }}
                  onManualAction={openManualAction}
                />
                <LunaComposer
                  inputRef={inputRef}
                  input={input}
                  setInput={setInput}
                  thread={thread}
                  messageCount={messages.length}
                  loading={loadingThread}
                  sending={sendInFlight}
                  storageError={storageError}
                  assistantError={visibleAssistantError}
                  onSend={() => void send()}
                  onStartFresh={() => void openDashboardLuna(true)}
                />
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
