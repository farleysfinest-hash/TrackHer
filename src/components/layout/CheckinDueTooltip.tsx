import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

interface CheckinDueTooltipProps {
  anchorRef: RefObject<HTMLElement | null>;
  label: string;
  onDismiss: () => void;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function CheckinDueTooltip({ anchorRef, label, onDismiss }: CheckinDueTooltipProps) {
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const dismissedRef = useRef(false);

  useEffect(() => {
    const measure = () => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPos({
        left: rect.left + rect.width / 2,
        bottom: window.innerHeight - rect.top + 8,
      });
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [anchorRef]);

  useEffect(() => {
    let leaveTimer: number | undefined;

    const dismiss = () => {
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      setLeaving(true);
      const delay = prefersReducedMotion() ? 150 : 220;
      leaveTimer = window.setTimeout(() => onDismissRef.current(), delay);
    };

    const autoTimer = window.setTimeout(dismiss, 4000);
    window.addEventListener('pointerdown', dismiss);

    return () => {
      window.clearTimeout(autoTimer);
      if (leaveTimer !== undefined) window.clearTimeout(leaveTimer);
      window.removeEventListener('pointerdown', dismiss);
    };
  }, []);

  if (!pos) return null;

  return (
    <div
      role="status"
      className={[
        'pointer-events-none fixed z-50 whitespace-nowrap rounded-lg bg-sage-700 px-3 py-1.5 text-sm text-on-accent',
        leaving ? 'checkin-due-tooltip-out' : 'checkin-due-tooltip-in',
      ].join(' ')}
      style={{
        left: pos.left,
        bottom: pos.bottom,
      }}
    >
      {label}
      <span
        aria-hidden
        className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-sage-700"
      />
    </div>
  );
}
