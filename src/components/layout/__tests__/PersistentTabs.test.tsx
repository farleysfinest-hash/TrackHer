import { useState } from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import { PersistentTabs } from '../PersistentTabs';

vi.mock('../../../pages/DashboardPage', () => {
  function DashboardStub() {
    const [count, setCount] = useState(0);
    return (
      <div data-testid="page-dashboard">
        <button type="button" onClick={() => setCount((n) => n + 1)}>
          bump-dashboard
        </button>
        <span data-testid="dashboard-count">{count}</span>
      </div>
    );
  }
  return { DashboardPage: DashboardStub, default: DashboardStub };
});

vi.mock('../../../pages/MedicationsPage', () => {
  function MedicationsStub() {
    return <div data-testid="page-medications">medications</div>;
  }
  return { MedicationsPage: MedicationsStub, default: MedicationsStub };
});

vi.mock('../../../pages/CheckinPage', () => {
  function CheckinStub() {
    return <div data-testid="page-checkin">checkin</div>;
  }
  return { CheckinPage: CheckinStub, default: CheckinStub };
});

vi.mock('../../../pages/LabsPage', () => {
  function LabsStub() {
    return <div data-testid="page-labs">labs</div>;
  }
  return { LabsPage: LabsStub, default: LabsStub };
});

vi.mock('../../../pages/InsightsPage', () => {
  function InsightsStub() {
    return <div data-testid="page-insights">insights</div>;
  }
  return { InsightsPage: InsightsStub, default: InsightsStub };
});

function Harness({ initialPath = '/dashboard' }: { initialPath?: string }) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <nav aria-label="test-tabs">
        <Link to="/dashboard">go-dashboard</Link>
        <Link to="/medications">go-medications</Link>
        <Link to="/checkin">go-checkin</Link>
        <Link to="/labs">go-labs</Link>
        <Link to="/insights">go-insights</Link>
      </nav>
      <Routes>
        <Route path="*" element={<PersistentTabs />} />
      </Routes>
    </MemoryRouter>
  );
}

function panelFor(testId: string): HTMLElement {
  const page = screen.getByTestId(testId);
  const panel = page.closest('[aria-hidden]') as HTMLElement | null;
  if (!panel) throw new Error(`No aria-hidden panel for ${testId}`);
  return panel;
}

describe('PersistentTabs', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 1;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps a visited tab mounted but genuinely hidden when inactive', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByTestId('page-dashboard')).toBeInTheDocument();
    expect(panelFor('page-dashboard').hidden).toBe(false);
    expect(panelFor('page-dashboard')).not.toHaveAttribute('aria-hidden', 'true');

    await user.click(screen.getByRole('link', { name: 'go-medications' }));
    await waitFor(() => {
      expect(screen.getByTestId('page-medications')).toBeInTheDocument();
    });
    expect(screen.getByTestId('page-dashboard')).toBeInTheDocument();

    const dashPanel = panelFor('page-dashboard');
    const medsPanel = panelFor('page-medications');
    expect(dashPanel.hidden).toBe(true);
    expect(dashPanel).toHaveAttribute('aria-hidden', 'true');
    expect(dashPanel.className).toContain('hidden');
    expect(medsPanel.hidden).toBe(false);
    expect(medsPanel).not.toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByTestId('page-checkin')).not.toBeInTheDocument();
  });

  it('preserves local component state across leave and return', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'bump-dashboard' }));
    expect(screen.getByTestId('dashboard-count')).toHaveTextContent('1');

    await user.click(screen.getByRole('link', { name: 'go-checkin' }));
    await waitFor(() => {
      expect(screen.getByTestId('page-checkin')).toBeInTheDocument();
    });
    expect(panelFor('page-dashboard').hidden).toBe(true);

    await user.click(screen.getByRole('link', { name: 'go-dashboard' }));
    expect(panelFor('page-dashboard').hidden).toBe(false);
    expect(screen.getByTestId('dashboard-count')).toHaveTextContent('1');
  });

  it('dispatches one resize when an existing hidden tab becomes active', async () => {
    const user = userEvent.setup();
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    render(<Harness />);

    await user.click(screen.getByRole('link', { name: 'go-labs' }));
    await waitFor(() => {
      expect(screen.getByTestId('page-labs')).toBeInTheDocument();
    });
    dispatchSpy.mockClear();

    await user.click(screen.getByRole('link', { name: 'go-dashboard' }));

    const resizeCalls = dispatchSpy.mock.calls.filter(
      ([event]) => event instanceof Event && event.type === 'resize',
    );
    expect(resizeCalls.length).toBeGreaterThanOrEqual(1);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it('shows only the selected tab as interactive/visible among mounted ones', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('link', { name: 'go-insights' }));
    await waitFor(() => {
      expect(screen.getByTestId('page-insights')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('link', { name: 'go-medications' }));
    await waitFor(() => {
      expect(screen.getByTestId('page-medications')).toBeInTheDocument();
    });

    const mounted = ['page-dashboard', 'page-medications', 'page-insights'] as const;
    for (const id of mounted) {
      const panel = panelFor(id);
      if (id === 'page-medications') {
        expect(panel.hidden).toBe(false);
        expect(within(panel).getByTestId(id)).toBeVisible();
      } else {
        expect(panel.hidden).toBe(true);
      }
    }
  });
});
