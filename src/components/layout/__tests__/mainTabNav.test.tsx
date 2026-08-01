import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { MobileNav } from '../MobileNav';
import { Sidebar } from '../Sidebar';

vi.mock('../../../hooks/useCheckinStatus', () => ({
  useCheckinStatus: () => ({
    hasCheckedInToday: true,
    isDue: false,
    isLoading: false,
  }),
}));

vi.mock('../NavDueContext', () => ({
  useNavDosesDue: () => ({ needsDoses: false }),
}));

const MAIN_PATHS = [
  '/dashboard',
  '/medications',
  '/checkin',
  '/labs',
  '/insights',
] as const;

function LocationProbe() {
  const { pathname } = useLocation();
  return <div data-testid="location">{pathname}</div>;
}

function MobileHarness({ initialPath = '/dashboard' }: { initialPath?: string }) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <LocationProbe />
      <MobileNav />
      <Routes>
        {MAIN_PATHS.map((path) => (
          <Route key={path} path={path} element={<div />} />
        ))}
      </Routes>
    </MemoryRouter>
  );
}

function SidebarHarness({ initialPath = '/dashboard' }: { initialPath?: string }) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <LocationProbe />
      <Sidebar />
      <Routes>
        {MAIN_PATHS.map((path) => (
          <Route key={path} path={path} element={<div />} />
        ))}
      </Routes>
    </MemoryRouter>
  );
}

describe('main tab NavLinks', () => {
  it('does not ship the startTransition tab navigate helper', () => {
    const leftover = import.meta.glob('../useTabNavigate.ts');
    expect(Object.keys(leftover)).toHaveLength(0);
  });

  it('MobileNav points each item at the correct route without transition interceptors', async () => {
    const user = userEvent.setup();
    render(<MobileHarness />);

    const nav = screen.getByRole('navigation');
    const links = within(nav).getAllByRole('link');
    const hrefs = links.map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([...MAIN_PATHS]);

    // No custom transition helper — navigation is ordinary NavLink routing.
    await user.click(within(nav).getByRole('link', { name: 'Check In' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/checkin');

    await user.click(within(nav).getByRole('link', { name: 'Insights' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/insights');
  });

  it('Sidebar points each item at the correct route without transition interceptors', async () => {
    const user = userEvent.setup();
    render(<SidebarHarness />);

    const nav = screen.getAllByRole('navigation')[0];
    const tabLinks = within(nav)
      .getAllByRole('link')
      .filter((a) => MAIN_PATHS.includes(a.getAttribute('href') as (typeof MAIN_PATHS)[number]));
    const hrefs = tabLinks.map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([...MAIN_PATHS]);

    await user.click(within(nav).getByRole('link', { name: 'Lab Results' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/labs');
  });
});
