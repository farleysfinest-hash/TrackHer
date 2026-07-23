import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

const PULL_THRESHOLD_PX = 70;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function applyPullResistance(delta: number): number {
  if (delta <= 0) return 0;
  return delta / (1 + delta / 180);
}

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  /** When false, touch listeners no-op (e.g. tab kept mounted but hidden). */
  enabled?: boolean;
}

/**
 * Window-scroll pull-to-refresh. Dashboard (and other main tabs) scroll the
 * document via PersistentTabs — not an inner overflow div — so we key off
 * `window.scrollY === 0` and listen on the window for touch only.
 */
export function PullToRefresh({ onRefresh, children, enabled = true }: PullToRefreshProps) {
  const [pullPx, setPullPx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullPxRef = useRef(0);
  const startYRef = useRef<number | null>(null);
  const armedRef = useRef(false);
  const pullingRef = useRef(false);
  const refreshingRef = useRef(false);
  const enabledRef = useRef(enabled);
  const onRefreshRef = useRef(onRefresh);
  const overscrollPrevRef = useRef<string | null>(null);

  enabledRef.current = enabled;
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const setPull = (px: number) => {
      pullPxRef.current = px;
      setPullPx(px);
    };

    const armOverscrollContain = () => {
      if (overscrollPrevRef.current !== null) return;
      overscrollPrevRef.current = document.documentElement.style.overscrollBehaviorY;
      document.documentElement.style.overscrollBehaviorY = 'contain';
    };

    const releaseOverscrollContain = () => {
      if (overscrollPrevRef.current === null) return;
      document.documentElement.style.overscrollBehaviorY = overscrollPrevRef.current;
      overscrollPrevRef.current = null;
    };

    const resetGesture = () => {
      armedRef.current = false;
      pullingRef.current = false;
      startYRef.current = null;
      releaseOverscrollContain();
    };

    const onTouchStart = (e: TouchEvent) => {
      if (!enabledRef.current || refreshingRef.current) return;
      if (window.scrollY > 0) {
        resetGesture();
        return;
      }
      armedRef.current = true;
      pullingRef.current = false;
      startYRef.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!enabledRef.current || !armedRef.current || startYRef.current === null) return;
      if (refreshingRef.current) return;

      if (window.scrollY > 0 && !pullingRef.current) {
        resetGesture();
        setPull(0);
        return;
      }

      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        pullingRef.current = false;
        setPull(0);
        releaseOverscrollContain();
        return;
      }

      pullingRef.current = true;
      armOverscrollContain();
      // Stop native rubber-band from fighting the custom pull.
      e.preventDefault();
      setPull(applyPullResistance(delta));
    };

    const onTouchEnd = () => {
      if (!enabledRef.current || !armedRef.current) {
        resetGesture();
        return;
      }

      const pulled = pullPxRef.current;
      const shouldRefresh = pulled >= PULL_THRESHOLD_PX;
      resetGesture();

      if (!shouldRefresh || refreshingRef.current) {
        setPull(0);
        return;
      }

      refreshingRef.current = true;
      setRefreshing(true);
      if (prefersReducedMotion()) {
        setPull(0);
      } else {
        setPull(PULL_THRESHOLD_PX * 0.55);
      }

      void (async () => {
        try {
          await onRefreshRef.current();
        } finally {
          refreshingRef.current = false;
          setRefreshing(false);
          setPull(0);
        }
      })();
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      releaseOverscrollContain();
    };
  }, []);

  const reducedMotionRef = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  const showSpinner = refreshing || pullPx > 12;
  const contentOffset = reducedMotionRef.current ? 0 : pullPx;

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-1"
        style={{ height: Math.max(contentOffset, refreshing ? 28 : 0) }}
        aria-hidden={!showSpinner}
      >
        {showSpinner ? (
          <Loader2
            className={[
              'h-5 w-5 text-sage-400',
              refreshing || pullPx >= PULL_THRESHOLD_PX ? 'animate-spin' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />
        ) : null}
      </div>
      <div
        style={{
          transform: contentOffset ? `translateY(${contentOffset}px)` : undefined,
          transition: refreshing || pullPx === 0 ? 'transform 200ms ease-out' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
