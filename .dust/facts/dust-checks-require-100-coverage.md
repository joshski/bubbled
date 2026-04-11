# Dust checks require 100% coverage

`bunx dust check` runs Vitest with coverage enabled via `bun run test:coverage`. The check fails if lines, functions, branches, or statements fall below 100%. Changes should not be committed until coverage reaches 100%.
