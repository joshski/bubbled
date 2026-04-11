# Run Vitest coverage in dust checks

Dust checks should run Vitest with coverage enabled and require 100% coverage before committing.

This task should update the dust check flow so coverage runs automatically, failures are visible, and the contribution workflow makes the full coverage requirement explicit.

## Task Type

implement

## Blocked By

(none)


## Definition of Done

- Dust checks run Vitest with coverage enabled as part of the standard check flow.
- The check fails when coverage is below 100% for the enforced metrics.
- Repository guidance or workflow documentation states that changes should not be committed until coverage reaches 100%.
