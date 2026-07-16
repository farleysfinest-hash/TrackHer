import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Pill,
  ClipboardCheck,
  TestTube2,
  Lightbulb,
} from 'lucide-react';
import { Logo } from '../ui/Logo';
import { APP_VERSION } from '../../lib/constants';
import logoMark from '../../assets/logo-mark.png';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/medications', label: 'Medications', icon: Pill },
  { path: '/checkin', label: 'Check In', icon: ClipboardCheck },
  { path: '/labs', label: 'Lab Results', icon: TestTube2 },
  { path: '/insights', label: 'Insights', icon: Lightbulb },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[240px] flex-col border-r border-sand-200 bg-white md:flex">
      <div className="flex items-center justify-between gap-2 border-b border-sand-200 px-6 py-4">
        <Logo />
        <img
          src={logoMark}
          alt=""
          width={64}
          height={64}
          className="block h-16 w-16 shrink-0 object-contain"
        />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sage-100 text-sage-700'
                  : 'text-sage-600 hover:bg-sage-50 hover:text-sage-700',
              ].join(' ')
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sand-200 px-6 py-4">
        <span
          className="text-sm text-sage-400 cursor-default"
          title="Support email coming soon"
        >
          Need Help?
        </span>
        <p className="mt-1 text-xs text-sage-400">v{APP_VERSION}</p>
      </div>
    </aside>
  );
}
