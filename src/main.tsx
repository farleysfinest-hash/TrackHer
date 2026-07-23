import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { App } from './App';
import './index.css';
import { useAuthStore } from './stores/authStore';
import { initializeSubscriptions } from './lib/subscriptions';

/** System appearance → `.dark` on <html> + status bar icons. Runs before React to avoid a light flash. */
function applyColorScheme(mq: MediaQueryList | MediaQueryListEvent): void {
  const isDark = mq.matches;
  document.documentElement.classList.toggle('dark', isDark);
  if (!Capacitor.isNativePlatform()) return;
  // Style.Dark = light icons (dark chrome); Style.Light = dark icons (light chrome).
  void StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {
    // Native chrome must never block boot.
  });
}

const colorSchemeMq = window.matchMedia('(prefers-color-scheme: dark)');
applyColorScheme(colorSchemeMq);
colorSchemeMq.addEventListener('change', applyColorScheme);

async function initNativeShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (Capacitor.getPlatform() === 'ios') {
    try {
      await Keyboard.setAccessoryBarVisible({ isVisible: false });
    } catch {
      // Native chrome must never block boot.
    }
  }
}

void initNativeShell();

useAuthStore.getState().initialize();

useAuthStore.subscribe((state, prev) => {
  if (state.user?.id && state.user.id !== prev.user?.id) {
    void initializeSubscriptions(state.user.id);
  }
});

void initializeSubscriptions(useAuthStore.getState().user?.id);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
