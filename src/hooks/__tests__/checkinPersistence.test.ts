import { describe, expect, it, vi } from 'vitest';
import {
  persistCheckinBundle,
  type CheckinBundleInput,
  type CheckinPersistenceClient,
} from '../checkinPersistence';

function makeInput(overrides: Partial<CheckinBundleInput> = {}): CheckinBundleInput {
  return {
    checkinId: null,
    checkinDate: '2026-07-15',
    checkinPayload: {
      checkin_type: 'full',
      hot_flashes: 2,
      mrs_complete: true,
    },
    extendedSymptoms: [{ symptom_key: 'brain_fog', severity_score: 3 }],
    assessment: {
      instrument_id: 'mrs',
      total_score: 18,
      total_severity: 'moderate',
      subscale_scores: {},
      item_responses: { hot_flashes: 2 },
    },
    ...overrides,
  };
}

describe('persistCheckinBundle', () => {
  it('sends the complete bundle through one database transaction RPC', async () => {
    const input = makeInput();
    const rpc = vi.fn().mockResolvedValue({
      data: { id: 'checkin-1', checkin_date: input.checkinDate },
      error: null,
    });

    const result = await persistCheckinBundle(input, {
      supabaseClient: { rpc } as CheckinPersistenceClient,
    });

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('save_checkin_bundle', {
      p_checkin_id: null,
      p_checkin_date: input.checkinDate,
      p_checkin: input.checkinPayload,
      p_extended_symptoms: input.extendedSymptoms,
      p_assessment: input.assessment,
    });
    expect(result.id).toBe('checkin-1');
  });

  it('passes an existing ID for an atomic update', async () => {
    const input = makeInput({ checkinId: 'checkin-existing' });
    const rpc = vi.fn().mockResolvedValue({
      data: { id: input.checkinId, checkin_date: input.checkinDate },
      error: null,
    });

    await persistCheckinBundle(input, {
      supabaseClient: { rpc } as CheckinPersistenceClient,
    });

    expect(rpc).toHaveBeenCalledWith(
      'save_checkin_bundle',
      expect.objectContaining({ p_checkin_id: 'checkin-existing' }),
    );
  });

  it('rejects the complete operation when the RPC fails', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'extended symptom insert failed' },
    });

    await expect(
      persistCheckinBundle(makeInput(), {
        supabaseClient: { rpc } as CheckinPersistenceClient,
      }),
    ).rejects.toThrow('Failed to save check-in: extended symptom insert failed');
  });

  it('rejects a successful response that contains no check-in', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });

    await expect(
      persistCheckinBundle(makeInput(), {
        supabaseClient: { rpc } as CheckinPersistenceClient,
      }),
    ).rejects.toThrow('database returned no check-in');
  });
});
