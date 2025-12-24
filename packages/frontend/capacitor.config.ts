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
    SocialLogin: {
      google: {
        webClientId: '1052845276050-cl9ic8288m776q01fjlqo7b3q91ljvut.apps.googleusercontent.com',
      },
    },
  },
};

export default config;
