export const testEnvironment = 'jsdom'

export const coverageTestExclude = [
  'node_modules/**',
  'coverage/**',
  '**/*.e2e.test.ts',
  '**/*.e2e.test.tsx',
  'bubble-browser/browser-verification.test.ts',
  'examples/todo-app/server.test.ts',
]

export const coverageExclude = [
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

export const coverageThresholds = {
  lines: 100,
  functions: 100,
  branches: 100,
  statements: 100,
}
