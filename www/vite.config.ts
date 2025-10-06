import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/orbit-crab/',
  server: {
    port: 3000,
    open: true
  },
  optimizeDeps: {
    exclude: ['orbit-crab']
  },
  assetsInclude: ['**/*.wasm'],
  build: {
    rollupOptions: {
      external: []
    }
  }
})
