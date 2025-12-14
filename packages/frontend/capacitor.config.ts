import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gurudodindin.app',
  appName: 'Guru do Dindin',
  webDir: 'dist',
  android: {
    backgroundColor: '#0f172a',
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
