import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useNavDosesDue } from './NavDueContext';
import { CheckinDueTooltip } from './CheckinDueTooltip';
import {
  CHECKIN_DUE_NAV,
  CheckinDueDot,
} from './navDueStyles';

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

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

/** In-memory session gates for the due tooltip (not persisted). */
let lastShownAt: number | null = null;
let lastHiddenAt: number | null = null;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function MobileNav() {
  const { hasCheckedInToday, isDue, isLoading } = useCheckinStatus();
  const { needsDoses } = useNavDosesDue();
  const needsCheckin =
    !isLoading && (!hasCheckedInToday || isDue || needsDoses);

  const checkinRef = useRef<HTMLAnchorElement | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [runSettle, setRunSettle] = useState(false);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        lastHiddenAt = Date.now();
        return;
      }
      if (
        document.visibilityState === 'visible' &&
        lastHiddenAt !== null &&
        Date.now() - lastHiddenAt > FOUR_HOURS_MS
      ) {
        lastShownAt = null;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (isLoading || !needsCheckin || lastShownAt !== null) return;
    lastShownAt = Date.now();
    setShowTooltip(true);
  }, [isLoading, needsCheckin]);

  useEffect(() => {
    if (!needsCheckin) {
      setShowTooltip(false);
    }
  }, [needsCheckin]);

  const handleTooltipDismiss = useCallback(() => {
    setShowTooltip(false);
    if (needsCheckin && !prefersReducedMotion()) {
      setRunSettle(true);
    }
  }, [needsCheckin]);

  useEffect(() => {
    if (!runSettle) return;
    const timer = window.setTimeout(() => setRunSettle(false), 3600);
    return () => window.clearTimeout(timer);
  }, [runSettle]);

  const tooltipLabel = isDue
    ? 'Weekly check-in due'
    : needsDoses && hasCheckedInToday
      ? 'Doses due today'
      : 'Daily check-in due';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-sand-200 bg-sand-50 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ path, label, icon, resolveIcon }) => {
          const Icon = resolveIcon ? resolveIcon(needsCheckin) : icon;
          const isCheckin = path === '/checkin';
          const showDue = isCheckin && needsCheckin;

          return (
            <NavLink
              key={path}
              to={path}
              ref={isCheckin ? checkinRef : undefined}
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
                  'relative flex flex-col items-center gap-0.5 py-1 text-xs transition-colors',
                  showDue
                    ? `${CHECKIN_DUE_NAV} px-3`
                    : [
                        'px-2 font-medium',
                        isActive ? 'text-sage-500' : 'text-sage-400',
                      ].join(' '),
                ].join(' ')
              }
            >
              {showDue && runSettle && (
                <span className="checkin-capsule-settle" aria-hidden />
              )}
              <span className="relative">
                <Icon className="h-5 w-5" />
                {showDue && <CheckinDueDot />}
              </span>
              <span>{label}</span>
            </NavLink>
          );
        })}
      </div>

      {showTooltip && needsCheckin && (
        <CheckinDueTooltip
          anchorRef={checkinRef}
          label={tooltipLabel}
          onDismiss={handleTooltipDismiss}
        />
      )}
    </nav>
  );
}
