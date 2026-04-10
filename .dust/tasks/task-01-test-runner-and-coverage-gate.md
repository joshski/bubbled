# Task 01: Test runner and coverage gate

Implement Task 01: Test runner and coverage gate.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- The repo can run tests and fail if coverage drops below 100%.

Cover the following tests in the same change:
- A smoke test that proves the test command runs.
- Coverage thresholds enforced in configuration and CI.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

(none)

## Definition of Done

- [ ] The repo can run tests and fail if coverage drops below 100%.
- [ ] A smoke test that proves the test command runs.
- [ ] Coverage thresholds enforced in configuration and CI.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
