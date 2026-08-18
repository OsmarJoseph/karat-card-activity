import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],

  // One .env at the repo root serves every workspace, so the browser's API URL sits
  // beside the API's own configuration rather than in a second file.
  envDir: fileURLToPath(new URL('../..', import.meta.url)),

  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },

  // Matches CORS_ORIGINS in .env.example.
  server: { port: 5173, strictPort: true },
})
