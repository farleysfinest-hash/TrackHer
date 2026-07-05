import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Pill,
  ClipboardCheck,
  TestTube2,
  Lightbulb,
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/medications', label: 'Meds', icon: Pill },
  { path: '/checkin', label: 'Check In', icon: ClipboardCheck },
  { path: '/labs', label: 'Labs', icon: TestTube2 },
  { path: '/insights', label: 'Insights', icon: Lightbulb },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-sand-200 bg-white md:hidden safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              [
                'flex flex-col items-center gap-0.5 px-2 py-1 text-xs font-medium transition-colors',
                isActive ? 'text-sage-500' : 'text-sage-400',
              ].join(' ')
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
