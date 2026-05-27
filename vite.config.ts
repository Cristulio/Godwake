import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Sprite SVGs (src/assets/sprites/**) must externalize, not inline as
    // base64 — otherwise they end up back in the JS bundle and defeat the
    // whole refactor. Everything else keeps the Vite default (≤4 KB inline).
    assetsInlineLimit: (filePath) =>
      filePath.includes('/assets/sprites/') ? false : undefined,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
