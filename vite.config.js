import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

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
  build: {
    // Two pages, each with its own code: the judge app (index.html) and
    // the admin dashboard (admin.html), so judges never download admin code.
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        admin: fileURLToPath(new URL('./admin.html', import.meta.url)),
      },
    },
  },
})