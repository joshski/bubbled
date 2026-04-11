import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    exclude: [
      'node_modules/**',
      'coverage/**',
      'examples/todo-app/server.test.ts',
    ],
    coverage: {
      provider: 'istanbul',
      include: ['**/*.ts', '**/*.tsx'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        'examples/todo-app/client.ts',
        'examples/todo-app/main.ts',
        'examples/todo-app/server.ts',
        'node_modules/**',
        'coverage/**',
        'vitest.config.ts',
      ],
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 97,
        statements: 100,
      },
    },
  },
})
