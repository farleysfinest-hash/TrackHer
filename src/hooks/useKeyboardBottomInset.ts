import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

/**
 * Bottom inset (px) covered by the soft keyboard.
 * Capacitor on native; visualViewport on mobile web. Desktop stays 0.
 */
export function useKeyboardBottomInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const show = Keyboard.addListener('keyboardWillShow', (info) => {
        setInset(Math.max(0, Math.round(info.keyboardHeight)));
      });
      const hide = Keyboard.addListener('keyboardWillHide', () => {
        setInset(0);
      });
      return () => {
        void show.then((h) => h.remove());
        void hide.then((h) => h.remove());
      };
    }

    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setInset(Math.round(covered));
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}
