import { defineConfig } from 'vitest/config'

import {
  coverageExclude,
  coverageThresholds,
  testEnvironment,
  unitCoverageTestExclude,
} from './vitest.shared'

export default defineConfig({
  test: {
    environment: testEnvironment,
    exclude: unitCoverageTestExclude,
    coverage: {
      provider: 'istanbul',
      include: ['**/*.ts', '**/*.tsx'],
      exclude: [...coverageExclude, 'vitest.coverage.config.ts'],
      reporter: ['text', 'lcov'],
      thresholds: coverageThresholds,
    },
  },
})
