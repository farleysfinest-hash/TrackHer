import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { App } from './App';
import './index.css';
import { useAuthStore } from './stores/authStore';
import { initializeSubscriptions } from './lib/subscriptions';

async function initNativeShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    // Dark icons on light background (matches white / sand shell).
    await StatusBar.setStyle({ style: Style.Light });
  } catch {
    // Native chrome must never block boot.
  }
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
