import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Header } from './Header';
import { PersistentTabs, isMainTabPath } from './PersistentTabs';
import { InsightsProvider } from '../../hooks/useInsights';
import { NavDueProvider } from './NavDueContext';
import { useReminderSync } from '../../hooks/useReminderSync';
import { useAuthStore } from '../../stores/authStore';
import { refreshCheckinStatusForCurrentUser } from '../../stores/checkinStatusStore';
import { prefetchCoreData } from '../../lib/prefetchCoreData';
import { resyncRemindersForCurrentUser } from '../../hooks/useReminderSync';

function useCoreDataPrefetch() {
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!userId) return;
    void prefetchCoreData();
  }, [userId]);
}

function useCheckinStatusVisibilityRefresh() {
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void (async () => {
          await refreshCheckinStatusForCurrentUser();
          await resyncRemindersForCurrentUser();
        })();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
}

function useNotificationNavigation() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handle: { remove: () => Promise<void> } | undefined;
    void LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      const path = event.notification.extra?.path;
      if (typeof path === 'string' && path.startsWith('/')) {
        navigate(path);
      }
    }).then((listener) => {
      handle = listener;
    });

    return () => {
      void handle?.remove();
    };
  }, [navigate]);
}

/** Pathname-aware chrome — kept outside InsightsProvider so tab switches don't rebuild insights. */
function AppShellChrome() {
  const { pathname } = useLocation();
  const onMainTab = isMainTabPath(pathname);

  return (
    <div className="flex min-h-screen max-w-[100vw] bg-sand-50">
      <Sidebar />
      <div className="safe-area-sidebar-offset flex min-w-0 max-w-full flex-1 flex-col">
        <Header />
        <main className="safe-area-main-x min-w-0 max-w-full flex-1 overflow-x-clip py-6 pb-24 md:py-8 md:pb-8">
          <div className="mx-auto min-w-0 max-w-[1200px]">
            <PersistentTabs />
            {!onMainTab && <Outlet />}
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}

export function AppShell() {
  useReminderSync();
  useNotificationNavigation();
  useCoreDataPrefetch();
  useCheckinStatusVisibilityRefresh();

  return (
    <InsightsProvider>
      <NavDueProvider>
        <AppShellChrome />
      </NavDueProvider>
    </InsightsProvider>
  );
}
