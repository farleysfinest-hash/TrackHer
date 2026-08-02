import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LunaProvider, useLuna } from '../LunaProvider';

Element.prototype.scrollIntoView = vi.fn();

const mocks = vi.hoisted(() => {
  const thread = {
    id: 'thread-1',
    user_id: 'user-1',
    kind: 'dashboard',
    title: 'Luna',
    context_data: {},
    summary: null,
    summarized_message_count: 0,
    is_dashboard_primary: true,
    last_message_preview: null,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
  };
  return {
    thread,
    ask: vi.fn(async () => ({
      reply: 'I am taking this seriously. Use the support actions above.',
      model: 'trackher-companion-script',
      shape: 'crisis',
      crisis: {
        tier: 'crisis',
        responseCount: 1,
        showSafetyPanel: true,
        expiresAt: '2026-08-04T00:00:00.000Z',
      },
    })),
    clearError: vi.fn(),
    loadLunaCrisisState: vi.fn(),
  };
});

vi.mock('../../../stores/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ user: { id: 'user-1' }, profile: { display_name: 'James' } }),
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
  let messageNumber = 0;
  return {
    MemorySafetyError,
    listLunaThreads: vi.fn(async () => [mocks.thread]),
    listLunaMemories: vi.fn(async () => []),
    loadLunaCrisisState: mocks.loadLunaCrisisState,
    getOrCreateDashboardLunaThread: vi.fn(async () => mocks.thread),
    loadLunaMessages: vi.fn(async () => []),
    addLunaMessage: vi.fn(async (input: { role: 'user' | 'assistant'; content: string }) => ({
      id: `message-${++messageNumber}`,
      user_id: 'user-1',
      thread_id: 'thread-1',
      role: input.role,
      content: input.content,
      metadata: {},
      crisis_tier: null,
      created_at: '2026-08-01T00:00:00.000Z',
    })),
    markLunaMessageCrisis: vi.fn(async () => undefined),
    updateLunaThreadSummary: vi.fn(async () => undefined),
    createFocusedLunaThread: vi.fn(),
    getOrCreateFocusedLunaThread: vi.fn(),
    deleteLunaThread: vi.fn(),
    addLunaMemory: vi.fn(),
    clearLunaCrisisState: vi.fn(async () => undefined),
    clearLunaMemories: vi.fn(),
    deleteLunaMemory: vi.fn(),
    saveLunaFeedback: vi.fn(),
    updateLunaMemory: vi.fn(),
    lunaPersistenceError: () => 'Storage unavailable',
  };
});

function OpenLunaButton() {
  const { openDashboardLuna } = useLuna();
  return (
    <button type="button" onClick={() => void openDashboardLuna()}>
      Open Luna
    </button>
  );
}

describe('LunaProvider crisis persistence fallback', () => {
  it('keeps immediate safety actions visible when the DB reread fails', async () => {
    mocks.loadLunaCrisisState
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('database unavailable'));
    const user = userEvent.setup();
    render(
      <LunaProvider>
        <OpenLunaButton />
      </LunaProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Open Luna' }));
    const input = await screen.findByPlaceholderText('Tell Luna what’s going on…');
    await user.type(input, 'I need immediate help');
    await user.click(screen.getByRole('button', { name: 'Send to Luna' }));

    const safetyPanelHeading = await screen.findByText('Immediate support stays within reach');
    expect(safetyPanelHeading).toBeVisible();
    expect(safetyPanelHeading.parentElement).toHaveClass('sticky', 'top-0', 'z-10');
    expect(screen.getByRole('link', { name: '988' })).toHaveAttribute('href', 'tel:988');
    await waitFor(() => expect(screen.getByText('Storage unavailable')).toBeVisible());
  });

  it('shows the safety panel and crisis-tags the turn when the risk classifier is down', async () => {
    mocks.loadLunaCrisisState.mockResolvedValue(null);
    mocks.ask.mockResolvedValueOnce({
      reply: "I'm having a brief glitch checking how you're doing. Call or text 988 if you're in a hard place.",
      model: 'trackher-companion-script',
      shape: 'risk_classifier_unavailable',
      crisis: {
        tier: 'crisis',
        responseCount: 1,
        showSafetyPanel: true,
        expiresAt: '2026-08-04T00:00:00.000Z',
      },
    });
    const { markLunaMessageCrisis } = await import('../../../lib/lunaConversations');
    const user = userEvent.setup();
    render(
      <LunaProvider>
        <OpenLunaButton />
      </LunaProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Open Luna' }));
    const input = await screen.findByPlaceholderText('Tell Luna what’s going on…');
    await user.type(input, 'I have been feeling worthless lately');
    await user.click(screen.getByRole('button', { name: 'Send to Luna' }));

    expect(await screen.findByText('Immediate support stays within reach')).toBeVisible();
    await waitFor(() =>
      expect(vi.mocked(markLunaMessageCrisis)).toHaveBeenCalledWith(
        'user-1',
        expect.any(String),
        'crisis',
      ),
    );
  });

  it('keeps the support panel visible for an active crisis tier', async () => {
    mocks.loadLunaCrisisState.mockResolvedValue({
      user_id: 'user-1',
      tier: 'crisis',
      response_count: 1,
      presented_actions: [],
      asked_questions: [],
      escalated: false,
      last_activity_at: '2026-08-01T00:00:00.000Z',
      expires_at: '2026-08-04T00:00:00.000Z',
    });
    const user = userEvent.setup();
    render(
      <LunaProvider>
        <OpenLunaButton />
      </LunaProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Open Luna' }));
    expect(await screen.findByText('Immediate support stays within reach')).toBeVisible();
    expect(
      screen.getByRole('button', { name: "I don't want these prompts right now" }),
    ).toBeVisible();
  });
});
