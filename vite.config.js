import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In development, forward any /api request to the local backend,
    // so the browser never has to make a cross-origin request.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})