# Task 02: Public entrypoints exist

Implement Task 02: Public entrypoints exist.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- The initial package entrypoints can be imported without side effects.

Cover the following tests in the same change:
- Import tests for each entrypoint.
- Verify that importing does not mutate globals or throw.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 01: Test runner and coverage gate](./task-01-test-runner-and-coverage-gate.md)

## Definition of Done

- [ ] The initial package entrypoints can be imported without side effects.
- [ ] Import tests for each entrypoint.
- [ ] Verify that importing does not mutate globals or throw.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
