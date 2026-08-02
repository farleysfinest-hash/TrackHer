import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAiInsightLayer } from '../useAiInsightLayer';
import type { AiFactsPacketInput } from '../../utils/aiFactsPacket';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

const mocks = vi.hoisted(() => ({
  authState: { user: { id: 'user-a' } as { id: string } | null },
  invokeImproveInsights: vi.fn(),
  readAiInsightCache: vi.fn(async () => null),
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector(mocks.authState),
}));

vi.mock('../../utils/aiFactsPacket', () => ({
  buildAiFactsPacket: () => ({
    mrs: [{ date: '2026-08-01' }],
    pulseRecent: { daysSampled: 1 },
  }),
}));

vi.mock('../../utils/aiInsightsCache', () => ({
  hashAiFactsPacket: () => 'same-data',
  readAiInsightCache: mocks.readAiInsightCache,
  writeAiInsightCache: vi.fn(async () => undefined),
}));

vi.mock('../useAiAssistant', () => ({
  invokeImproveInsights: mocks.invokeImproveInsights,
}));

vi.mock('../../utils/aiCandidateEventLog', () => ({
  logAiCandidateEvent: vi.fn(),
}));

vi.mock('../../lib/lunaConversations', () => ({
  listLunaMemories: vi.fn(async () => []),
  hashLunaMemories: () => 'same-memory',
  onLunaMemoryChanged: () => () => undefined,
}));

const context = {} as AiFactsPacketInput;

function synthesisResult(title: string) {
  return {
    polished: [],
    candidates: [
      {
        candidateKey: `luna-v1-${title.toLowerCase().replaceAll(' ', '-')}`,
        evidenceClass: 'early_signal',
        title,
        body: `${title} body`,
        citedFacts: ['recorded fact'],
        whyItMatters: 'Why',
        limitations: 'Limits',
        strength: 'Moderate data',
      },
    ],
    insufficient: null,
    monitorNote: null,
  };
}

describe('useAiInsightLayer account scoping', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    mocks.authState.user = { id: 'user-a' };
    mocks.invokeImproveInsights.mockReset();
    mocks.readAiInsightCache.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not let account A session markers suppress account B synthesis', async () => {
    sessionStorage.setItem(
      'trackher_luna_synthesis_hash:user-a',
      'c3-evidence-v1-same-data-same-memory',
    );
    mocks.invokeImproveInsights.mockResolvedValue(synthesisResult('B finding'));
    const view = renderHook(() => useAiInsightLayer(context, [], true));

    await act(async () => Promise.resolve());
    await act(async () => vi.advanceTimersByTimeAsync(1600));
    expect(mocks.invokeImproveInsights).not.toHaveBeenCalled();

    mocks.authState.user = { id: 'user-b' };
    view.rerender();
    await act(async () => Promise.resolve());
    await act(async () => vi.advanceTimersByTimeAsync(1600));

    expect(mocks.invokeImproveInsights).toHaveBeenCalledTimes(1);
    expect(view.result.current.candidates.map((candidate) => candidate.title)).toEqual([
      'B finding',
    ]);
    expect(sessionStorage.getItem('trackher_luna_synthesis_hash:user-b')).toBe(
      'c3-evidence-v1-same-data-same-memory',
    );
  });

  it('ignores account A synthesis that resolves after switching to B', async () => {
    const accountA = deferred<ReturnType<typeof synthesisResult> | null>();
    mocks.invokeImproveInsights
      .mockReturnValueOnce(accountA.promise)
      .mockResolvedValueOnce(synthesisResult('B only'));
    const view = renderHook(() => useAiInsightLayer(context, [], true));

    await act(async () => Promise.resolve());
    await act(async () => vi.advanceTimersByTimeAsync(1600));
    expect(mocks.invokeImproveInsights).toHaveBeenCalledTimes(1);

    mocks.authState.user = { id: 'user-b' };
    view.rerender();
    expect(view.result.current.candidates).toEqual([]);
    await act(async () => accountA.resolve(synthesisResult('A private')));
    expect(view.result.current.candidates).toEqual([]);

    await act(async () => Promise.resolve());
    await act(async () => vi.advanceTimersByTimeAsync(1600));
    expect(mocks.invokeImproveInsights).toHaveBeenCalledTimes(2);
    expect(view.result.current.candidates.map((candidate) => candidate.title)).toEqual(['B only']);
  });

  it('uses the evidence-derived candidate key even when result ordering changes', async () => {
    mocks.invokeImproveInsights.mockResolvedValue({
      ...synthesisResult('First'),
      candidates: [
        { ...synthesisResult('First').candidates[0], candidateKey: 'luna-v1-evidence-a' },
        { ...synthesisResult('Second').candidates[0], candidateKey: 'luna-v1-evidence-b' },
      ],
    });
    const view = renderHook(() => useAiInsightLayer(context, [], true));

    await act(async () => Promise.resolve());
    await act(async () => vi.advanceTimersByTimeAsync(1600));

    expect(view.result.current.candidates.map((candidate) => candidate.id)).toEqual([
      'luna-v1-evidence-a',
      'luna-v1-evidence-b',
    ]);
  });

  it('does not invoke or expose synthesis while the Pro gate is disabled', async () => {
    const view = renderHook(({ enabled }) => useAiInsightLayer(context, [], enabled), {
      initialProps: { enabled: true },
    });
    mocks.invokeImproveInsights.mockResolvedValue(synthesisResult('Pro finding'));

    view.rerender({ enabled: false });
    await act(async () => Promise.resolve());
    await act(async () => vi.advanceTimersByTimeAsync(2000));

    expect(mocks.invokeImproveInsights).not.toHaveBeenCalled();
    expect(view.result.current.candidates).toEqual([]);
  });

  it('clears the session marker so Try again can re-invoke synthesis', async () => {
    sessionStorage.setItem(
      'trackher_luna_synthesis_hash:user-a',
      'c3-evidence-v1-same-data-same-memory',
    );
    mocks.invokeImproveInsights.mockResolvedValue(null);
    const view = renderHook(() => useAiInsightLayer(context, [], true));

    await act(async () => Promise.resolve());
    await act(async () => vi.advanceTimersByTimeAsync(1600));
    expect(mocks.invokeImproveInsights).not.toHaveBeenCalled();

    await act(async () => {
      view.result.current.retrySynthesis();
    });
    expect(sessionStorage.getItem('trackher_luna_synthesis_hash:user-a')).toBeNull();

    mocks.invokeImproveInsights.mockResolvedValue(synthesisResult('Retry finding'));
    await act(async () => Promise.resolve());
    await act(async () => vi.advanceTimersByTimeAsync(1600));

    expect(mocks.invokeImproveInsights).toHaveBeenCalledTimes(1);
    expect(view.result.current.candidates.map((candidate) => candidate.title)).toEqual([
      'Retry finding',
    ]);
  });
});
