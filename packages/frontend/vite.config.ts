import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => ({
  plugins: [react()],
  // base: './' apenas para Capacitor (mobile), '/' para web
  // Use VITE_BUILD_TARGET=capacitor para builds mobile
  base: process.env.VITE_BUILD_TARGET === 'capacitor' ? './' : '/',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
}))
