import { defineConfig } from 'vitest/config'

import {
  coverageTestExclude,
  coverageExclude,
  coverageThresholds,
  testEnvironment,
} from './vitest.shared'

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
