import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config for the CANDOLER React frontend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
})
