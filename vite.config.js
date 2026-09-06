import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages (`https://GMB19.github.io/fantasy/`) needs base `/fantasy/`
// Local / Azure uses `/`. Set VITE_GH_PAGES=true in the GH Pages workflow.
const isGhPages = process.env.VITE_GH_PAGES === 'true'

export default defineConfig({
  base: isGhPages ? '/fantasy/' : '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    headers: {
      'X-Frame-Options': 'ALLOWALL'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    },
    hmr: {
      clientPort: 443
    },
    cors: true
  }
})
