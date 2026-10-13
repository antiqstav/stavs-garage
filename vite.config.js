import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // the Whisper worker uses ES modules (needed by the transformers library)
  worker: { format: 'es' },
})
