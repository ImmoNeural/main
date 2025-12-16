import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gurudodindin.app',
  appName: 'Guru do Dindin',
  webDir: 'dist',
  android: {
    backgroundColor: '#1e40af',
    allowMixedContent: true,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
