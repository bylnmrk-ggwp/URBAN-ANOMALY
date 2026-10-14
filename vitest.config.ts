import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    testTimeout: 15_000,
    hookTimeout: 15_000,
    // jsdom page suites are heavy; cap workers so timeouts reflect code, not CPU contention.
    maxWorkers: 4,
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
})
