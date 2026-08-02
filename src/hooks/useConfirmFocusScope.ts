import { useEffect, useRef } from 'react';
import { trapTabKey } from '../lib/focusTrap';

/**
 * Focus scope for inline confirm alertdialogs nested inside a larger
 * focus-trapped panel. Capture-phase handlers win over the panel trap:
 * Escape dismisses only the confirm (not the panel) and Tab cycles inside
 * the confirm while it is open. On dismiss, focus returns to the control
 * that opened the confirm, or to the host dialog if that control is gone.
 */
export function useConfirmFocusScope(
  active: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
  onDismiss: () => void,
): void {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!active) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const host = containerRef.current?.closest<HTMLElement>('[role="dialog"]') ?? null;
    const cancel = containerRef.current?.querySelector<HTMLElement>('button[data-cancel]');
    cancel?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onDismissRef.current();
        return;
      }
      if (event.key === 'Tab') {
        event.stopPropagation();
        trapTabKey(event, containerRef.current);
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      if (previousFocus?.isConnected) previousFocus.focus();
      else host?.focus();
    };
  }, [active, containerRef]);
}
