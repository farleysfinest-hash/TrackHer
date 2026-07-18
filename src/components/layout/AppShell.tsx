import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Header } from './Header';

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-sand-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col md:ml-[240px]">
        <Header />
        <main className="min-w-0 flex-1 px-6 py-6 pb-24 md:px-8 md:py-8 md:pb-8 lg:px-12">
          <div className="mx-auto min-w-0 max-w-[1200px]">
            <Outlet />
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
