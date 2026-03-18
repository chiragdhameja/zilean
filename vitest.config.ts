import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    environmentMatchGlobs: [
      ['tests/renderer/**', 'jsdom']
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['electron/**/*.ts'],
      exclude: ['electron/main/index.ts']
    }
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'shared')
    }
  }
})
