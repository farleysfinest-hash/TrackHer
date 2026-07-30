import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

const KEYBOARD_INSET_VAR = '--keyboard-inset';

function setCssInset(px: number) {
  document.documentElement.style.setProperty(KEYBOARD_INSET_VAR, `${Math.max(0, px)}px`);
}

/**
 * Bottom inset (px) covered by the soft keyboard.
 *
 * Prefer visualViewport; fall back to Capacitor keyboardHeight. Also syncs
 * `--keyboard-inset` on :root so modals/sheets/pages can pad without each
 * mounting their own listeners.
 */
export function useKeyboardBottomInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;

    const fromViewport = (): number => {
      if (!vv) return 0;
      return Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    };

    const apply = (fallbackHeight?: number) => {
      const vvInset = fromViewport();
      let next = 0;
      if (vvInset > 0) next = vvInset;
      else if (typeof fallbackHeight === 'number' && fallbackHeight > 0) {
        next = Math.round(fallbackHeight);
      }
      setInset(next);
      setCssInset(next);
    };

    const onVv = () => apply();

    vv?.addEventListener('resize', onVv);
    vv?.addEventListener('scroll', onVv);

    const handles: Array<Promise<{ remove: () => void }>> = [];
    if (Capacitor.isNativePlatform()) {
      handles.push(
        Keyboard.addListener('keyboardWillShow', (info) => apply(info.keyboardHeight)),
      );
      handles.push(Keyboard.addListener('keyboardDidShow', (info) => apply(info.keyboardHeight)));
      handles.push(
        Keyboard.addListener('keyboardWillHide', () => {
          setInset(0);
          setCssInset(0);
        }),
      );
    }

    apply();

    return () => {
      vv?.removeEventListener('resize', onVv);
      vv?.removeEventListener('scroll', onVv);
      for (const h of handles) void h.then((l) => l.remove());
      setCssInset(0);
    };
  }, []);

  return inset;
}

/**
 * App-wide: keep the focused text field above the soft keyboard.
 * Call once from AppShell (or root layout).
 */
export function useKeyboardAvoidance(): void {
  const inset = useKeyboardBottomInset();

  useEffect(() => {
    const scrollFocusedIntoView = () => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement)) return;
      const tag = el.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !el.isContentEditable) return;

      // Leave room for the keyboard + a little breathing room above the caret.
      const pad = inset > 0 ? inset + 24 : 24;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });

      // Extra nudge for fixed sheets that ignore scrollIntoView of the page.
      const rect = el.getBoundingClientRect();
      const visibleBottom = window.innerHeight - pad;
      if (rect.bottom > visibleBottom) {
        const delta = rect.bottom - visibleBottom;
        const scroller =
          el.closest<HTMLElement>('[data-keyboard-scroll], .overflow-y-auto, [role="dialog"]') ??
          null;
        if (scroller) {
          scroller.scrollTop += delta;
        } else {
          window.scrollBy({ top: delta, behavior: 'smooth' });
        }
      }
    };

    const onFocusIn = () => {
      window.setTimeout(scrollFocusedIntoView, 50);
      window.setTimeout(scrollFocusedIntoView, 300);
    };

    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, [inset]);

  useEffect(() => {
    if (inset <= 0) return;
    const el = document.activeElement;
    if (!(el instanceof HTMLElement)) return;
    const tag = el.tagName;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !el.isContentEditable) return;
    window.setTimeout(() => {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 16);
  }, [inset]);
}
