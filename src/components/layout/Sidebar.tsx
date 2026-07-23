import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Pill,
  ClipboardCheck,
  ClipboardList,
  TestTube2,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';
import { Logo } from '../ui/Logo';
import { LogoMark } from '../ui/LogoMark';
import { APP_VERSION } from '../../lib/constants';
import { useCheckinStatus } from '../../hooks/useCheckinStatus';

const navItems: Array<{
  path: string;
  label: string;
  icon: LucideIcon;
  resolveIcon?: (needsCheckin: boolean) => LucideIcon;
}> = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/medications', label: 'Medications', icon: Pill },
  {
    path: '/checkin',
    label: 'Check In',
    icon: ClipboardCheck,
    resolveIcon: (needsCheckin) => (needsCheckin ? ClipboardList : ClipboardCheck),
  },
  { path: '/labs', label: 'Lab Results', icon: TestTube2 },
  { path: '/insights', label: 'Insights', icon: Lightbulb },
];

export function Sidebar() {
  const { hasCheckedInToday, isDue, isLoading } = useCheckinStatus();
  // Mirror prompt cards: pulse owed if nothing logged today; weekly owed via isDue.
  const needsCheckin = !isLoading && (!hasCheckedInToday || isDue);

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[240px] flex-col border-r border-sand-200 bg-sand-50 md:flex">
      <div className="flex items-center justify-between gap-2 border-b border-sand-200 px-6 py-4">
        <Logo />
        <LogoMark size={64} className="h-16 w-16" />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ path, label, icon, resolveIcon }) => {
          const Icon = resolveIcon ? resolveIcon(needsCheckin) : icon;
          const isCheckin = path === '/checkin';
          const showDue = isCheckin && needsCheckin;

          return (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 py-2.5 text-sm transition-colors',
                  showDue
                    ? 'rounded-full bg-sage-100 px-4 font-medium text-sage-600'
                    : [
                        'rounded-lg px-3 font-medium',
                        isActive
                          ? 'bg-sage-100 text-sage-700'
                          : 'text-sage-600 hover:bg-sage-50 hover:text-sage-700',
                      ].join(' '),
                ].join(' ')
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          );
        })}
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
