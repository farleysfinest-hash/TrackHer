import { useEffect, useRef } from 'react';
import { FOCUSABLE_SELECTOR, trapTabKey } from '../lib/focusTrap';

/**
 * Focus trap for custom fullscreen / sheet dialogs that are not the shared Modal.
 * Matches Modal behaviour: focus first control on open, Tab cycles inside, Escape
 * calls onEscape, restore previous focus on close, lock body scroll while open.
 */
export function useFocusTrap(
  active: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
  onEscape?: () => void,
): void {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const panel = containerRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? panel)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscapeRef.current?.();
        return;
      }
      trapTabKey(e, containerRef.current);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [active, containerRef]);
}
