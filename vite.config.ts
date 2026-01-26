import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    globals: true,
    css: true,
    pool: 'threads',
    maxWorkers: 1,
    sequence: {
      concurrent: false,
      shuffle: false,
    },
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**', 'supabase/functions/**'],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/modules/events/data/**',
        'src/modules/inventory/data/**',
        'src/modules/purchasing/data/**',
        'src/lib/**',
      ],
      exclude: ['**/*.d.ts'],
      thresholds: {
        lines: 0.9,
        statements: 0.9,
        functions: 0.9,
        branches: 0.9,
      },
    },
  },
})
