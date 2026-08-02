import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LunaProvider, useLuna } from '../LunaProvider';

Element.prototype.scrollIntoView = vi.fn();

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const mocks = vi.hoisted(() => {
  const makeThread = (id: string, userId = 'user-a', preview: string | null = null) => ({
    id,
    user_id: userId,
    kind: id === 'thread-a' || id === 'thread-b-account' ? 'dashboard' : 'insight',
    title: id,
    context_data: {},
    summary: null,
    summary_message_count: 0,
    is_dashboard_primary: id === 'thread-a' || id === 'thread-b-account',
    last_message_preview: preview,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
  });
  return {
    authState: {
      user: { id: 'user-a' } as { id: string } | null,
      profile: { display_name: 'James' },
    },
    threadA: makeThread('thread-a', 'user-a', 'A preview'),
    threadB: makeThread('thread-b', 'user-a', 'B preview'),
    accountBThread: makeThread('thread-b-account', 'user-b', 'B account preview'),
    ask: vi.fn(),
    clearError: vi.fn(),
    addLunaMessage: vi.fn(),
    loadLunaMessages: vi.fn(),
    listLunaThreads: vi.fn(),
    listLunaMemories: vi.fn(),
    clearLunaMemories: vi.fn(),
    messageNumber: 0,
  };
});

vi.mock('../../../stores/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector(mocks.authState),
}));

vi.mock('../../../hooks/useInsights', () => ({
  useInsights: () => ({ aiContext: {} }),
}));

vi.mock('../../../utils/aiFactsPacket', () => ({
  buildAiFactsPacket: () => ({ mrs: [], pulseRecent: { daysSampled: 0 } }),
}));

vi.mock('../../../utils/aiInsightsCache', () => ({
  hashAiFactsPacket: () => 'facts-hash',
}));

vi.mock('../../../hooks/useKeyboardBottomInset', () => ({
  useVisualViewportBounds: () => ({ offsetTop: 0, height: 800 }),
}));

vi.mock('../../../lib/uiState', () => ({
  hasUiFlag: () => true,
  setUiFlag: vi.fn(),
}));

vi.mock('../../../hooks/useAiAssistant', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../hooks/useAiAssistant')>();
  return {
    ...original,
    invokeThreadSummary: vi.fn(async () => null),
    useAiAssistant: () => ({
      ask: mocks.ask,
      isSending: false,
      error: null,
      clearError: mocks.clearError,
    }),
  };
});

vi.mock('../../../lib/lunaConversations', () => {
  class MemorySafetyError extends Error {}
  return {
    MemorySafetyError,
    listLunaThreads: mocks.listLunaThreads,
    listLunaMemories: mocks.listLunaMemories,
    loadLunaCrisisState: vi.fn(async () => null),
    getOrCreateDashboardLunaThread: vi.fn(async (userId: string) =>
      userId === 'user-b' ? mocks.accountBThread : mocks.threadA,
    ),
    createFocusedLunaThread: vi.fn(async () => mocks.threadB),
    getOrCreateFocusedLunaThread: vi.fn(async () => mocks.threadB),
    loadLunaMessages: mocks.loadLunaMessages,
    addLunaMessage: mocks.addLunaMessage,
    markLunaMessageCrisis: vi.fn(async () => undefined),
    updateLunaThreadSummary: vi.fn(async () => undefined),
    deleteLunaThread: vi.fn(async () => undefined),
    addLunaMemory: vi.fn(),
    clearLunaMemories: mocks.clearLunaMemories,
    deleteLunaMemory: vi.fn(),
    saveLunaFeedback: vi.fn(),
    updateLunaMemory: vi.fn(),
    lunaPersistenceError: (error: unknown) =>
      error instanceof Error ? error.message : 'Storage unavailable',
  };
});

function message(id: string, threadId: string, content: string, role: 'user' | 'assistant' = 'assistant') {
  return {
    id,
    user_id: mocks.authState.user?.id ?? 'user-a',
    thread_id: threadId,
    role,
    content,
    metadata: {},
    crisis_tier: null,
    created_at: `2026-08-01T00:00:${String(++mocks.messageNumber).padStart(2, '0')}.000Z`,
  };
}

function Harness() {
  const { openDashboardLuna, openLuna, dashboardPreview } = useLuna();
  return (
    <div>
      <button type="button" onClick={() => void openDashboardLuna()}>
        Open A
      </button>
      <button
        type="button"
        onClick={() =>
          void openLuna({ kind: 'insight', title: 'Thread B', context: { sourceType: 'test' } })
        }
      >
        Open B
      </button>
      <span data-testid="dashboard-preview">{dashboardPreview ?? 'none'}</span>
    </div>
  );
}

function App() {
  return (
    <LunaProvider>
      <Harness />
    </LunaProvider>
  );
}

describe('LunaProvider async identity boundaries', () => {
  beforeEach(() => {
    mocks.authState.user = { id: 'user-a' };
    mocks.messageNumber = 0;
    mocks.ask.mockReset();
    mocks.addLunaMessage.mockReset();
    mocks.loadLunaMessages.mockReset();
    mocks.listLunaThreads.mockReset();
    mocks.listLunaMemories.mockReset();
    mocks.listLunaMemories.mockResolvedValue([]);
    mocks.clearLunaMemories.mockReset();
    mocks.clearLunaMemories.mockResolvedValue(undefined);
    mocks.listLunaThreads.mockImplementation(async (userId: string) =>
      userId === 'user-b' ? [mocks.accountBThread] : [mocks.threadA, mocks.threadB],
    );
    mocks.loadLunaMessages.mockImplementation(async (_userId: string, threadId: string) =>
      threadId === 'thread-b' ? [message('b-existing', threadId, 'B existing')] : [],
    );
    mocks.addLunaMessage.mockImplementation(async (input: {
      userId: string;
      threadId: string;
      role: 'user' | 'assistant';
      content: string;
    }) => message(`saved-${mocks.messageNumber + 1}`, input.threadId, input.content, input.role));
  });

  it('persists a late A reply only to A and never applies it to B', async () => {
    const response = deferred<{ reply: string; model: string } | null>();
    mocks.ask.mockReturnValueOnce(response.promise);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Open A' }));
    const composer = await screen.findByPlaceholderText('Tell Luna what’s going on…');
    await user.type(composer, 'Question for A');
    await user.click(screen.getByRole('button', { name: 'Send to Luna' }));
    await waitFor(() => expect(mocks.ask).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Open B' }));
    expect(await screen.findByText('B existing')).toBeVisible();

    await act(async () => response.resolve({ reply: 'Late answer for A', model: 'test' }));

    await waitFor(() =>
      expect(
        mocks.addLunaMessage.mock.calls.filter(
          ([input]) => input.role === 'assistant' && input.content === 'Late answer for A',
        ),
      ).toHaveLength(1),
    );
    const assistantWrite = mocks.addLunaMessage.mock.calls.find(
      ([input]) => input.role === 'assistant' && input.content === 'Late answer for A',
    )?.[0];
    expect(assistantWrite.threadId).toBe('thread-a');
    expect(screen.queryByText('Late answer for A')).not.toBeInTheDocument();
    expect(screen.getByText('B existing')).toBeVisible();
  });

  it('exposes an accessible focus-trapped dialog and closes it with Escape', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Open A' }));
    const dialog = await screen.findByRole('dialog', { name: 'Luna' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Luna' })).not.toBeInTheDocument());
  });

  it('requires confirmation before clearing every Luna memory', async () => {
    mocks.listLunaMemories.mockResolvedValue([
      {
        id: 'memory-1',
        user_id: 'user-a',
        content: 'I work rotating night shifts',
        source_thread_id: 'thread-a',
        created_at: '2026-08-01T00:00:00.000Z',
        updated_at: '2026-08-01T00:00:00.000Z',
      },
    ]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Open A' }));
    await user.click(await screen.findByRole('button', { name: 'What Luna remembers' }));
    await user.click(await screen.findByRole('button', { name: 'Clear all memories' }));

    expect(mocks.clearLunaMemories).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog', { name: 'Clear all 1 memory?' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Yes, clear all' }));
    await waitFor(() => expect(mocks.clearLunaMemories).toHaveBeenCalledWith('user-a'));
    expect(screen.queryByText('I work rotating night shifts')).not.toBeInTheDocument();
  });

  it('grows the composer with its content up to the configured cap', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Open A' }));
    const composer = await screen.findByPlaceholderText('Tell Luna what’s going on…');
    Object.defineProperty(composer, 'scrollHeight', { configurable: true, value: 96 });
    await user.type(composer, 'A longer message');
    expect(composer).toHaveStyle({ height: '96px' });
  });

  it('ignores stale loads during rapid A to B to A navigation', async () => {
    const firstA = deferred<ReturnType<typeof message>[]>();
    const threadB = deferred<ReturnType<typeof message>[]>();
    const finalA = deferred<ReturnType<typeof message>[]>();
    mocks.loadLunaMessages
      .mockReturnValueOnce(firstA.promise)
      .mockReturnValueOnce(threadB.promise)
      .mockReturnValueOnce(finalA.promise);
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Open A' }));
    await waitFor(() => expect(mocks.loadLunaMessages).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Open B' }));
    await waitFor(() => expect(mocks.loadLunaMessages).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: 'Open A' }));
    await waitFor(() => expect(mocks.loadLunaMessages).toHaveBeenCalledTimes(3));

    await act(async () => finalA.resolve([message('a-final', 'thread-a', 'Final A selection')]));
    expect(await screen.findByText('Final A selection')).toBeVisible();

    await act(async () => {
      threadB.resolve([message('b-late', 'thread-b', 'Late B load')]);
      firstA.resolve([message('a-stale', 'thread-a', 'Stale A load')]);
    });

    await waitFor(() => expect(screen.getByText('Final A selection')).toBeVisible());
    expect(screen.queryByText('Late B load')).not.toBeInTheDocument();
    expect(screen.queryByText('Stale A load')).not.toBeInTheDocument();
  });

  it('uses an immediate submit lock so one submit creates one user and one assistant message', async () => {
    const response = deferred<{ reply: string; model: string } | null>();
    mocks.ask.mockReturnValueOnce(response.promise);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Open A' }));
    const composer = await screen.findByPlaceholderText('Tell Luna what’s going on…');
    await user.type(composer, 'Only once');
    const sendButton = screen.getByRole('button', { name: 'Send to Luna' });
    fireEvent.click(sendButton);
    fireEvent.click(sendButton);
    await waitFor(() => expect(mocks.ask).toHaveBeenCalledTimes(1));
    await act(async () => response.resolve({ reply: 'One reply', model: 'test' }));

    await waitFor(() => expect(mocks.addLunaMessage).toHaveBeenCalledTimes(2));
    expect(mocks.addLunaMessage.mock.calls.map(([input]) => input.role)).toEqual([
      'user',
      'assistant',
    ]);
    const requestIds = mocks.addLunaMessage.mock.calls.map(
      ([input]) => input.metadata.clientRequestId,
    );
    expect(requestIds[0]).toBeTruthy();
    expect(requestIds[1]).toBe(requestIds[0]);
  });

  it('surfaces assistant persistence failure on its origin and retries with the new thread history', async () => {
    mocks.ask
      .mockResolvedValueOnce({ reply: 'Unsaved A reply', model: 'test' })
      .mockResolvedValueOnce({ reply: 'Saved B reply', model: 'test' });
    mocks.addLunaMessage.mockImplementation(async (input: {
      userId: string;
      threadId: string;
      role: 'user' | 'assistant';
      content: string;
    }) => {
      if (input.role === 'assistant' && input.threadId === 'thread-a') {
        throw new Error('Assistant save failed');
      }
      return message(`saved-${mocks.messageNumber + 1}`, input.threadId, input.content, input.role);
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Open A' }));
    let composer = await screen.findByPlaceholderText('Tell Luna what’s going on…');
    await user.type(composer, 'Question A');
    await user.click(screen.getByRole('button', { name: 'Send to Luna' }));

    expect(await screen.findByText('Assistant save failed')).toBeVisible();
    expect(screen.queryByText('Unsaved A reply')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open B' }));
    expect(await screen.findByText('B existing')).toBeVisible();
    expect(screen.queryByText('Assistant save failed')).not.toBeInTheDocument();
    composer = screen.getByPlaceholderText('Tell Luna what’s going on…');
    await user.type(composer, 'Question B');
    await user.click(screen.getByRole('button', { name: 'Send to Luna' }));

    expect(await screen.findByText('Saved B reply')).toBeVisible();
    const secondHistory = mocks.ask.mock.calls[1][2] as Array<{ content: string }>;
    expect(secondHistory.map((turn) => turn.content)).toContain('B existing');
    expect(secondHistory.map((turn) => turn.content)).not.toContain('Question A');
  });

  it('remounts the Luna session on direct account switch and logout', async () => {
    mocks.loadLunaMessages.mockImplementation(async (_userId: string, threadId: string) =>
      threadId === 'thread-a' ? [message('a-private', threadId, 'Private A transcript')] : [],
    );
    const user = userEvent.setup();
    const view = render(<App />);

    await waitFor(() => expect(screen.getByTestId('dashboard-preview')).toHaveTextContent('A preview'));
    await user.click(screen.getByRole('button', { name: 'Open A' }));
    expect(await screen.findByText('Private A transcript')).toBeVisible();

    mocks.authState.user = { id: 'user-b' };
    view.rerender(<App />);

    await waitFor(() =>
      expect(screen.getByTestId('dashboard-preview')).toHaveTextContent('B account preview'),
    );
    expect(screen.queryByText('Private A transcript')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Tell Luna what’s going on…')).not.toBeInTheDocument();

    mocks.authState.user = null;
    view.rerender(<App />);
    await waitFor(() => expect(screen.getByTestId('dashboard-preview')).toHaveTextContent('none'));
  });
});
