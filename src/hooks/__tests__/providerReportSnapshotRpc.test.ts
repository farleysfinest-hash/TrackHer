import { describe, expect, it, vi } from 'vitest';
import {
  loadProviderReportSnapshotFromRpc,
  ProviderReportDataLoadError,
  type ProviderReportRpcClient,
} from '../providerReportData';

const RANGE = { start: '2026-01-01', end: '2026-07-15' };

describe('provider report snapshot RPC', () => {
  it('loads the complete range through one snapshot command', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        checkins: [{ id: 'checkin-1' }],
        medications: [{ id: 'med-1' }],
        medicationChanges: [],
        labResults: [],
        quickLogEvents: [{ id: 'quick-1' }],
        extendedSymptomLogs: [],
      },
      error: null,
    });

    const snapshot = await loadProviderReportSnapshotFromRpc(
      'user-1',
      RANGE,
      'Europe/Berlin',
      { rpcClient: { rpc } as ProviderReportRpcClient },
    );

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('get_provider_report_snapshot', {
      p_start: RANGE.start,
      p_end: RANGE.end,
      p_timezone: 'Europe/Berlin',
    });
    expect(snapshot.quickLogEvents).toEqual([{ id: 'quick-1' }]);
  });

  it('supports an honest multi-year All range without a client-side cap', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        checkins: [], medications: [], medicationChanges: [], labResults: [],
        quickLogEvents: [], extendedSymptomLogs: [],
      },
      error: null,
    });
    const allRange = { start: '2000-01-01', end: '2026-07-15' };
    await loadProviderReportSnapshotFromRpc('user-1', allRange, 'America/New_York', {
      rpcClient: { rpc } as ProviderReportRpcClient,
    });
    expect(rpc).toHaveBeenCalledWith('get_provider_report_snapshot', {
      p_start: allRange.start,
      p_end: allRange.end,
      p_timezone: 'America/New_York',
    });
  });

  it('rejects a reversed date range before querying', async () => {
    const rpc = vi.fn();
    await expect(
      loadProviderReportSnapshotFromRpc(
        'user-1',
        { start: '2026-07-16', end: '2026-07-15' },
        'America/New_York',
        { rpcClient: { rpc } as ProviderReportRpcClient },
      ),
    ).rejects.toThrow('start date');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('fails the whole report when the snapshot command fails', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'XX000', message: 'snapshot failed' },
    });
    await expect(
      loadProviderReportSnapshotFromRpc('user-1', RANGE, 'Asia/Tokyo', {
        rpcClient: { rpc } as ProviderReportRpcClient,
      }),
    ).rejects.toBeInstanceOf(ProviderReportDataLoadError);
  });
});
