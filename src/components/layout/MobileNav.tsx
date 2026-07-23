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
import { useCheckinStatus } from '../../hooks/useCheckinStatus';

const navItems: Array<{
  path: string;
  label: string;
  icon: LucideIcon;
  resolveIcon?: (needsCheckin: boolean) => LucideIcon;
}> = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/medications', label: 'Meds', icon: Pill },
  {
    path: '/checkin',
    label: 'Check In',
    icon: ClipboardCheck,
    resolveIcon: (needsCheckin) => (needsCheckin ? ClipboardList : ClipboardCheck),
  },
  { path: '/labs', label: 'Labs', icon: TestTube2 },
  { path: '/insights', label: 'Insights', icon: Lightbulb },
];

export function MobileNav() {
  const { hasCheckedInToday, isDue, isLoading } = useCheckinStatus();
  // Mirror prompt cards: pulse owed if nothing logged today; weekly owed via isDue.
  const needsCheckin = !isLoading && (!hasCheckedInToday || isDue);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-sand-200 bg-white md:hidden safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
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
                  'flex flex-col items-center gap-0.5 py-1 text-xs transition-colors',
                  showDue
                    ? 'rounded-full bg-sage-100 px-3 font-medium text-sage-600'
                    : [
                        'px-2 font-medium',
                        isActive ? 'text-sage-500' : 'text-sage-400',
                      ].join(' '),
                ].join(' ')
              }
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
