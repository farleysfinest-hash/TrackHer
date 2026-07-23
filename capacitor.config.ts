import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trackher.app',
  appName: 'TrackHer',
  webDir: 'dist',
  ios: {
    // CSS env(safe-area-inset-*) + viewport-fit=cover own the insets.
    // 'automatic' leaves a native strip that flashes black on rubber-band overscroll.
    contentInset: 'never',
    backgroundColor: '#ffffff',
  },
  plugins: {
    Keyboard: {
      resize: 'body',
    },
  },
};

export default config;
