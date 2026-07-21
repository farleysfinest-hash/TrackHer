import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trackher.app',
  appName: 'TrackHer',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
