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
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '1098694424138-qjfccuom1cbg68u4r1l4nnfmn4bjbsv9.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
