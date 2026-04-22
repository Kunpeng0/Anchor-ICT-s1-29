import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/signals' : 'http://localhost:8000',
      '/dashboard' : 'http://localhost:8000',
      '/graphs' : 'http://localhost:8000',
      '/health' : 'http://localhost:8000',
      '/events' : 'http://localhost:8000',
      '/query' : 'http://localhost:8000',
    },
  },
})
