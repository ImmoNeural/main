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
        webClientId: '1052845276050-b4s3ccf30hunbgg4ulqcsn8e7sgpj6et.apps.googleusercontent.com',
      },
    },
  },
};

export default config;
