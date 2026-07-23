import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Header } from './Header';
import { PersistentTabs, isMainTabPath } from './PersistentTabs';
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

export function AppShell() {
  const { pathname } = useLocation();
  useReminderSync();
  useNotificationNavigation();
  useCoreDataPrefetch();
  useCheckinStatusVisibilityRefresh();

  const onMainTab = isMainTabPath(pathname);

  return (
    <div className="flex min-h-screen max-w-[100vw] overflow-x-hidden bg-sand-50">
      <Sidebar />
      <div className="flex min-w-0 max-w-full flex-1 flex-col md:ml-[240px]">
        <Header />
        <main className="min-w-0 max-w-full flex-1 overflow-x-hidden px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8 lg:px-12">
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
