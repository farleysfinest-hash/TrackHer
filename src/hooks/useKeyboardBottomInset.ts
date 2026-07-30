import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

const KEYBOARD_INSET_VAR = '--keyboard-inset';

function setCssInset(px: number) {
  document.documentElement.style.setProperty(KEYBOARD_INSET_VAR, `${Math.max(0, px)}px`);
}

export interface VisualViewportBounds {
  /** Soft-keyboard coverage at the bottom of the layout viewport (px). */
  inset: number;
  /** visualViewport.offsetTop — iOS often shifts this when the keyboard opens. */
  offsetTop: number;
  /** Visible height of the visual viewport (px). */
  height: number;
}

function readBounds(fallbackKeyboardHeight?: number): VisualViewportBounds {
  const vv = window.visualViewport;
  if (!vv) {
    const inset =
      typeof fallbackKeyboardHeight === 'number' && fallbackKeyboardHeight > 0
        ? Math.round(fallbackKeyboardHeight)
        : 0;
    return { inset, offsetTop: 0, height: window.innerHeight - inset };
  }

  const offsetTop = Math.round(vv.offsetTop);
  const vvInset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
  const inset =
    vvInset > 0
      ? vvInset
      : typeof fallbackKeyboardHeight === 'number' && fallbackKeyboardHeight > 0
        ? Math.round(fallbackKeyboardHeight)
        : 0;

  return {
    inset,
    offsetTop,
    height: Math.round(vv.height),
  };
}

/**
 * Tracks the on-screen viewport while the soft keyboard is open.
 * Prefer this over inset-only math so fixed sheets snap into the visible frame
 * instead of sitting under a scrolled layout viewport.
 */
export function useVisualViewportBounds(): VisualViewportBounds {
  const [bounds, setBounds] = useState<VisualViewportBounds>(() => readBounds());

  useEffect(() => {
    const apply = (fallbackHeight?: number) => {
      const next = readBounds(fallbackHeight);
      setBounds(next);
      setCssInset(next.inset);
    };

    const onVv = () => apply();
    const vv = window.visualViewport;
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
          apply(0);
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

  return bounds;
}

/** Bottom inset only — thin wrapper for call sites that only need padding. */
export function useKeyboardBottomInset(): number {
  return useVisualViewportBounds().inset;
}

/**
 * App-wide: keep the focused text field above the soft keyboard.
 * Call once from the app root.
 */
export function useKeyboardAvoidance(): void {
  const { inset, offsetTop, height } = useVisualViewportBounds();

  useEffect(() => {
    const snapFocused = () => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement)) return;
      const tag = el.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !el.isContentEditable) return;

      // Prefer snapping the sheet/dialog that owns the field into the visual frame.
      const frame = el.closest<HTMLElement>('[data-vv-frame]');
      if (frame) {
        // Frame is already positioned to the visual viewport; just bring the
        // composer into the frame's scrollport if needed.
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        return;
      }

      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      const rect = el.getBoundingClientRect();
      const visibleBottom = offsetTop + height - 16;
      if (rect.bottom > visibleBottom) {
        window.scrollBy({ top: rect.bottom - visibleBottom, behavior: 'smooth' });
      }
    };

    const onFocusIn = () => {
      window.setTimeout(snapFocused, 50);
      window.setTimeout(snapFocused, 320);
    };

    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, [inset, offsetTop, height]);

  useEffect(() => {
    if (inset <= 0) return;
    const el = document.activeElement;
    if (!(el instanceof HTMLElement)) return;
    const tag = el.tagName;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !el.isContentEditable) return;
    window.setTimeout(() => {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 16);
  }, [inset, offsetTop, height]);
}
