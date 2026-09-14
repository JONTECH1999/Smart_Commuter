import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Base URL for GitHub Pages deployment
  base: '/Smart_Commuter/',
  // Ensure the base is applied during the production build
  build: {
    outDir: 'dist',
  },
  plugins: [react()],
})
