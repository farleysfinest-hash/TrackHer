import { Link, NavLink } from 'react-router-dom';
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
import { APP_VERSION, SUPPORT_EMAIL } from '../../lib/constants';
import { useCheckinStatus } from '../../hooks/useCheckinStatus';
import { useDosesDue } from '../../hooks/useDosesDue';
import {
  CHECKIN_DUE_NAV,
  CheckinDueDot,
  CHECKIN_DUE_WORD,
} from './navDueStyles';

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
  const { needsDoses } = useDosesDue();
  // Pulse, weekly MRS, or doses owed — Check-In owns the daily action stack.
  const needsCheckin =
    !isLoading && (!hasCheckedInToday || isDue || needsDoses);

  return (
    <aside className="safe-area-sidebar fixed left-0 top-0 z-30 hidden h-screen flex-col border-r border-sand-200 bg-sand-50 md:flex">
      <div className="flex items-center justify-between gap-2 border-b border-sand-200 px-6 py-4">
        <Logo />
        <LogoMark size={36} className="h-9 w-9" />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ path, label, icon, resolveIcon }) => {
          const Icon = resolveIcon ? resolveIcon(needsCheckin) : icon;
          const isCheckin = path === '/checkin';
          const showDue = isCheckin && needsCheckin;
          const dueWord = CHECKIN_DUE_WORD;

          return (
            <NavLink
              key={path}
              to={path}
              aria-label={
                showDue
                  ? isDue
                    ? `${label}, weekly check-in due`
                    : needsDoses && hasCheckedInToday
                      ? `${label}, doses due today`
                      : `${label}, daily check-in due`
                  : undefined
              }
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 py-2.5 text-sm transition-colors',
                  showDue
                    ? `${CHECKIN_DUE_NAV} px-4`
                    : [
                        'rounded-lg px-3 font-medium',
                        isActive
                          ? 'bg-sage-100 text-sage-700'
                          : 'text-sage-600 hover:bg-sage-50 hover:text-sage-700',
                      ].join(' '),
                ].join(' ')
              }
            >
              <span className="relative shrink-0">
                <Icon className="h-5 w-5" />
                {showDue && <CheckinDueDot />}
              </span>
              {showDue ? dueWord : label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-sand-200 px-6 py-4">
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="text-sm text-sage-500 underline underline-offset-2 hover:text-sage-700"
          title={`Email ${SUPPORT_EMAIL}`}
        >
          Need Help?
        </a>
        <p className="mt-2 text-xs text-sage-400">
          <Link to="/privacy" className="underline hover:text-sage-600">
            Privacy
          </Link>
          {' · '}
          <Link to="/terms" className="underline hover:text-sage-600">
            Terms
          </Link>
        </p>
        <p className="mt-1 text-xs text-sage-400">v{APP_VERSION}</p>
      </div>
    </aside>
  );
}
