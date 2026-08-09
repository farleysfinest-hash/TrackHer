import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardLayout } from '../DashboardLayout';

const mocks = vi.hoisted(() => ({
  quickLogOpen: false,
  refreshAll: vi.fn(async () => undefined),
}));

vi.mock('../../../stores/dashboardStore', () => ({
  useDashboardStore: (selector: (state: unknown) => unknown) =>
    selector({ dateRange: '3m', refreshDateRange: vi.fn() }),
}));
vi.mock('../../../stores/quickLogStore', () => ({
  useQuickLogStore: (selector: (state: unknown) => unknown) =>
    selector({ isSheetOpen: mocks.quickLogOpen }),
}));
vi.mock('../../../hooks/useChartData', () => ({
  useChartData: () => ({
    getSymptomTrendData: () => [],
    getMedicationChangeMarkers: () => [],
    getHeatmapData: () => [],
    getLabTrendData: () => [],
    getDrillDownData: vi.fn(),
    checkins: [],
    summaryCheckins: [],
    mrsCheckinCount: 0,
    earliestCheckinDate: null,
    checkinsLoading: false,
    medications: [],
    changes: [],
    labResults: [],
    allLabResults: [],
    refreshAll: mocks.refreshAll,
  }),
}));
vi.mock('../../../hooks/useCheckinStatus', () => ({
  useCheckinStatus: () => ({ isDue: false }),
}));
vi.mock('../../../hooks/useInsights', () => ({
  useInsights: () => ({
    insights: [],
    safeguardingInsights: [],
    dismissInsight: vi.fn(),
    extendedSymptoms: [],
  }),
}));
vi.mock('../../../hooks/useStageProfile', () => ({ useStageProfile: () => null }));
vi.mock('../../../engine/stageProfile', () => ({ getStageTrackingPhrase: () => null }));
vi.mock('../../../stores/checkinStatusStore', () => ({
  refreshCheckinStatusForCurrentUser: vi.fn(async () => undefined),
}));
vi.mock('../../../utils/labHelpers', () => ({ getDefaultBiomarkerKey: () => 'estradiol' }));
vi.mock('../../../utils/earlyStoryChartWindow', () => ({
  storyChartWindow: () => ({ start: '2026-01-01', end: '2026-08-01' }),
}));
vi.mock('../../../utils/checkinHelpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/checkinHelpers')>();
  return { ...actual, hasMRSData: () => false };
});
vi.mock('../../../hooks/useCheckinProgress', () => ({
  useCheckinProgress: () => [
    { label: 'Doses', done: false },
    { label: 'Pulse', done: false },
  ],
}));
vi.mock('../../checkin/CheckinProgressBar', () => ({
  CheckinProgressBar: () => null,
}));
vi.mock('../../ui/PullToRefresh', () => ({
  PullToRefresh: ({ enabled, children }: { enabled?: boolean; children: React.ReactNode }) => (
    <div data-testid="pull-to-refresh" data-enabled={String(enabled)}>
      {children}
    </div>
  ),
}));
vi.mock('../LunaDashboardCard', () => ({
  LunaDashboardCard: () => <div>Batch B Luna entry</div>,
}));
vi.mock('../QuickLogWidget', () => ({
  QuickLogWidget: () => <div>Batch B Quick Log entry</div>,
}));

vi.mock('../ScoreSummaryCards', () => ({ ScoreSummaryCards: () => null }));
vi.mock('../WelcomeMessage', () => ({ WelcomeMessage: () => null }));
vi.mock('../StoryColumn', () => ({ StoryColumn: () => null }));
vi.mock('../SubscaleChart', () => ({ SubscaleChart: () => null }));
vi.mock('../SymptomHeatmap', () => ({ SymptomHeatmap: () => null }));
vi.mock('../LabTrendChart', () => ({ LabTrendChart: () => null }));
vi.mock('../DrillDownControls', () => ({ DrillDownControls: () => null }));
vi.mock('../ActiveMedicationsSummary', () => ({ ActiveMedicationsSummary: () => null }));
vi.mock('../LabSummaryWidget', () => ({ LabSummaryWidget: () => null }));
vi.mock('../AppointmentCountdownCard', () => ({ AppointmentCountdownCard: () => null }));
vi.mock('../ProviderReportButton', () => ({ ProviderReportButton: () => null }));
vi.mock('../../insights/SafeguardingCard', () => ({ SafeguardingCard: () => null }));
vi.mock('../PersonalSymptomTrends', () => ({ PersonalSymptomTrends: () => null }));
vi.mock('../StrawStageCard', () => ({ StrawStageCard: () => null }));
vi.mock('../UnlockProgress', () => ({ UnlockProgress: () => null }));
vi.mock('../GhostChartFrame', () => ({ GhostChartFrame: () => null }));

function App() {
  return (
    <MemoryRouter initialEntries={['/dashboard']}>
      <DashboardLayout />
    </MemoryRouter>
  );
}

describe('Dashboard Batch B entry points', () => {
  beforeEach(() => {
    mocks.quickLogOpen = false;
    mocks.refreshAll.mockClear();
  });

  it('keeps both Luna and Quick Log reachable and suppresses pull-to-refresh while Quick Log is open', async () => {
    const view = render(<App />);

    expect(await screen.findByText('Batch B Luna entry')).toBeVisible();
    expect(screen.getByText('Batch B Quick Log entry')).toBeVisible();
    expect(screen.getByTestId('pull-to-refresh')).toHaveAttribute('data-enabled', 'true');

    mocks.quickLogOpen = true;
    view.rerender(<App />);

    await waitFor(() =>
      expect(screen.getByTestId('pull-to-refresh')).toHaveAttribute('data-enabled', 'false'),
    );
    expect(screen.getByText('Batch B Luna entry')).toBeVisible();
    expect(screen.getByText('Batch B Quick Log entry')).toBeVisible();
  });
});
