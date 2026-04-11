export const testEnvironment = 'jsdom'

export const defaultTestExclude = [
  'node_modules/**',
  'coverage/**',
  'examples/todo-app/server.test.ts',
]

export const coverageExclude = [
  '**/*.test.ts',
  '**/*.test.tsx',
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
  branches: 97,
  statements: 100,
}

export const unitCoverageTestExclude = [
  ...defaultTestExclude,
  '**/*.e2e.test.ts',
  '**/*.e2e.test.tsx',
  'bubble-browser/browser-verification.test.ts',
]
