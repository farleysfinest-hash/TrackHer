import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Header } from './Header';
import { useReminderSync } from '../../hooks/useReminderSync';

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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-sand-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col md:ml-[240px]">
        <Header />
        <main className="min-w-0 flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8 lg:px-12">
          <div className="mx-auto min-w-0 max-w-[1200px]">
            <Outlet />
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
