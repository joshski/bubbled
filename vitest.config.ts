import { defineConfig } from 'vitest/config'

const testEnvironment = 'node'

const coverageTestExclude = [
  'node_modules/**',
  'coverage/**',
  '**/*.e2e.test.ts',
  '**/*.e2e.test.tsx',
  'bubble-browser/browser-verification.test.ts',
  'examples/todo-app/bun/server.test.ts',
]

const coverageExclude = [
  '**/*.test.ts',
  '**/*.test.tsx',
  '.tmp-browser-verification-*/**',
  'examples/todo-app/browser/client.ts',
  'examples/todo-app/bun/main.ts',
  'examples/todo-app/bun/server.ts',
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
