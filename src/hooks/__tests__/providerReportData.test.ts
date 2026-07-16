import { describe, expect, it, vi } from 'vitest';
import {
  createFreshProviderReportBlob,
  ProviderReportDataLoadError,
  type ProviderReportSnapshot,
} from '../providerReportData';
import type {
  ExtendedSymptomLog,
  LabResult,
  Medication,
  MedicationChange,
  Profile,
  QuickLogEvent,
  SymptomCheckin,
} from '../../types/database';
import type { DateRange } from '../../stores/dashboardStore';
import type { ProviderReportData } from '../../utils/pdfReport';

const USER_ID = 'user-test-123';

function makeCheckin(id: string, checkinDate: string): SymptomCheckin {
  return { id, user_id: USER_ID, checkin_date: checkinDate } as SymptomCheckin;
}

function makeMedication(id: string, isActive: boolean, startDate: string): Medication {
  return { id, user_id: USER_ID, is_active: isActive, start_date: startDate } as Medication;
}

function makeMedicationChange(id: string, changeDate: string, createdAt: string): MedicationChange {
  return { id, user_id: USER_ID, change_date: changeDate, created_at: createdAt } as MedicationChange;
}

function makeLabResult(id: string, drawDate: string): LabResult {
  return { id, user_id: USER_ID, draw_date: drawDate } as LabResult;
}

function makeQuickLogEvent(id: string, loggedAt: string): QuickLogEvent {
  return { id, user_id: USER_ID, logged_at: loggedAt } as QuickLogEvent;
}

function makeExtendedLog(id: string): ExtendedSymptomLog {
  return { id, user_id: USER_ID, symptom_key: 'brain_fog' } as ExtendedSymptomLog;
}

function makeProfile(): Profile {
  return {
    id: USER_ID,
    display_name: 'Test Patient',
    timezone: 'America/Los_Angeles',
  } as Profile;
}

function makeDateRange(): DateRange {
  return { start: '2026-01-01', end: '2026-12-31' };
}

describe('createFreshProviderReportBlob', () => {
  it('loads the selected range once and passes the fresh snapshot to the PDF generator', async () => {
    const profile = makeProfile();
    const dateRange = makeDateRange();
    const timezone = 'America/Los_Angeles';
    const snapshot: ProviderReportSnapshot = {
      checkins: [makeCheckin('fresh-checkin', '2026-07-03')],
      medications: [makeMedication('fresh-med', true, '2026-07-01')],
      medicationChanges: [makeMedicationChange('fresh-change', '2026-07-02', '2026-07-02T12:00:00Z')],
      labResults: [makeLabResult('fresh-lab', '2026-07-04')],
      quickLogEvents: [makeQuickLogEvent('fresh-quick', '2026-07-05T09:00:00Z')],
      extendedSymptomLogs: [makeExtendedLog('fresh-ext')],
    };

    const loader = vi.fn(async () => snapshot);
    const expectedBlob = new Blob(['pdf'], { type: 'application/pdf' });
    const generateReport = vi.fn(async (_data: ProviderReportData) => expectedBlob);

    const blob = await createFreshProviderReportBlob(
      { userId: USER_ID, profile, dateRange, timezone, includeSafeguarding: true },
      { loadSnapshot: loader, generateReport },
    );

    expect(loader).toHaveBeenCalledOnce();
    expect(loader).toHaveBeenCalledWith(USER_ID, dateRange, timezone);
    expect(generateReport).toHaveBeenCalledWith({
      profile,
      medications: snapshot.medications,
      medicationChanges: snapshot.medicationChanges,
      checkins: snapshot.checkins,
      labResults: snapshot.labResults,
      extendedSymptomLogs: snapshot.extendedSymptomLogs,
      quickLogEvents: snapshot.quickLogEvents,
      dateRange,
      timezone,
      includeSafeguarding: true,
    });
    expect(blob).toBe(expectedBlob);
  });

  it('reloads snapshot data on every report generation', async () => {
    const empty = {
      medicationChanges: [], labResults: [], quickLogEvents: [], extendedSymptomLogs: [],
    };
    const snapshotA: ProviderReportSnapshot = {
      ...empty,
      checkins: [makeCheckin('a-checkin', '2026-01-01')],
      medications: [makeMedication('a-med', true, '2026-01-01')],
    };
    const snapshotB: ProviderReportSnapshot = {
      ...empty,
      checkins: [makeCheckin('b-checkin', '2026-02-01')],
      medications: [makeMedication('b-med', false, '2026-02-01')],
    };
    const loader = vi.fn().mockResolvedValueOnce(snapshotA).mockResolvedValueOnce(snapshotB);
    const generateReport = vi.fn<(data: ProviderReportData) => Promise<Blob>>(
      async () => new Blob(['pdf'], { type: 'application/pdf' }),
    );
    const params = {
      userId: USER_ID,
      profile: makeProfile(),
      dateRange: makeDateRange(),
      timezone: 'America/Los_Angeles',
      includeSafeguarding: false,
    };

    await createFreshProviderReportBlob(params, { loadSnapshot: loader, generateReport });
    await createFreshProviderReportBlob(params, { loadSnapshot: loader, generateReport });

    expect(loader).toHaveBeenCalledTimes(2);
    expect(generateReport.mock.calls[1]![0].checkins).toBe(snapshotB.checkins);
    expect(generateReport.mock.calls[1]![0].checkins).not.toBe(snapshotA.checkins);
  });

  it('does not generate a partial PDF when snapshot loading fails', async () => {
    const loader = vi.fn(async () => {
      throw new ProviderReportDataLoadError(
        ['provider_report_snapshot'],
        [{ source: 'provider_report_snapshot', code: 'XX000', message: 'failed' }],
      );
    });
    const generateReport = vi.fn(async () => new Blob(['pdf'], { type: 'application/pdf' }));

    await expect(
      createFreshProviderReportBlob(
        {
          userId: USER_ID,
          profile: makeProfile(),
          dateRange: makeDateRange(),
          timezone: 'America/Los_Angeles',
          includeSafeguarding: false,
        },
        { loadSnapshot: loader, generateReport },
      ),
    ).rejects.toBeInstanceOf(ProviderReportDataLoadError);
    expect(generateReport).not.toHaveBeenCalled();
  });
});
