import { Suspense, lazy, useEffect, useRef, useState, type ComponentType } from 'react';
import { useLocation } from 'react-router-dom';
import { RouteErrorBoundary } from '../ui/ErrorBoundary';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { DashboardPage } from '../../pages/DashboardPage';

const MedicationsPage = lazy(() =>
  import('../../pages/MedicationsPage').then((m) => ({ default: m.MedicationsPage })),
);
const CheckinPage = lazy(() =>
  import('../../pages/CheckinPage').then((m) => ({ default: m.CheckinPage })),
);
const LabsPage = lazy(() =>
  import('../../pages/LabsPage').then((m) => ({ default: m.LabsPage })),
);
const InsightsPage = lazy(() =>
  import('../../pages/InsightsPage').then((m) => ({ default: m.InsightsPage })),
);

const TAB_PATHS = [
  '/dashboard',
  '/medications',
  '/checkin',
  '/labs',
  '/insights',
] as const;

type TabPath = (typeof TAB_PATHS)[number];

const TAB_COMPONENTS: Record<TabPath, ComponentType> = {
  '/dashboard': DashboardPage,
  '/medications': MedicationsPage,
  '/checkin': CheckinPage,
  '/labs': LabsPage,
  '/insights': InsightsPage,
};

export function isMainTabPath(pathname: string): pathname is TabPath {
  return (TAB_PATHS as readonly string[]).includes(pathname);
}

function TabFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

/**
 * Keeps main shell tabs mounted after first visit and toggles visibility.
 * Avoids the remount/refetch flash that React Router's <Outlet /> causes on
 * every tab switch. Memory cost is fine for five phone-scale screens.
 */
export function PersistentTabs() {
  const { pathname } = useLocation();
  const [mounted, setMounted] = useState<Set<TabPath>>(() =>
    isMainTabPath(pathname) ? new Set([pathname]) : new Set(),
  );
  const scrollByPath = useRef<Map<string, number>>(new Map());
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (!isMainTabPath(pathname)) return;
    setMounted((prev) => {
      if (prev.has(pathname)) return prev;
      const next = new Set(prev);
      next.add(pathname);
      return next;
    });
  }, [pathname]);

  // Preserve scroll per tab instead of snapping to top on every switch.
  useEffect(() => {
    const leaving = prevPath.current;
    if (isMainTabPath(leaving)) {
      scrollByPath.current.set(leaving, window.scrollY);
    }

    if (isMainTabPath(pathname)) {
      const y = scrollByPath.current.get(pathname) ?? 0;
      window.scrollTo(0, y);
      // Recharts ResponsiveContainer sizes to 0 while display:none; nudge on show.
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
    } else {
      window.scrollTo(0, 0);
    }

    prevPath.current = pathname;
  }, [pathname]);

  if (!isMainTabPath(pathname) && mounted.size === 0) {
    return null;
  }

  return (
    <>
      {TAB_PATHS.map((path) => {
        if (!mounted.has(path)) return null;
        const active = pathname === path;
        const Page = TAB_COMPONENTS[path];
        return (
          <div
            key={path}
            hidden={!active}
            aria-hidden={!active}
            className={active ? undefined : 'hidden'}
          >
            <RouteErrorBoundary>
              <Suspense fallback={<TabFallback />}>
                <Page />
              </Suspense>
            </RouteErrorBoundary>
          </div>
        );
      })}
    </>
  );
}
