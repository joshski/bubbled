import { defineConfig } from 'vitest/config'

const testEnvironment = 'jsdom'

const coverageTestExclude = [
  'node_modules/**',
  'coverage/**',
  '**/*.e2e.test.ts',
  '**/*.e2e.test.tsx',
  'bubble-browser/browser-verification.test.ts',
  'examples/todo-app/server.test.ts',
]

const coverageExclude = [
  '**/*.test.ts',
  '**/*.test.tsx',
  '.tmp-browser-verification-*/**',
  'examples/todo-app/client.ts',
  'examples/todo-app/main.ts',
  'examples/todo-app/server.ts',
  'node_modules/**',
  'coverage/**',
  'vitest.config.ts',
]

const coverageThresholds = {
  lines: 100,
  functions: 100,
  branches: 100,
  statements: 100,
}

export default defineConfig({
  test: {
    environment: testEnvironment,
    exclude: coverageTestExclude,
    coverage: {
      provider: 'istanbul',
      include: ['**/*.ts', '**/*.tsx'],
      exclude: coverageExclude,
      reporter: ['text', 'lcov'],
      thresholds: coverageThresholds,
    },
  },
})
