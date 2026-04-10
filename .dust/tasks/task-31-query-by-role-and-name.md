# Task 31: Query by role and name

Implement Task 31: Query by role and name.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- The test harness can find nodes using semantic queries.

Cover the following tests in the same change:
- Query by role only.
- Query by role and name.
- Missing match produces clear failure output.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 30: Accessible name derivation](./task-30-accessible-name-derivation.md)

## Definition of Done

- [ ] The test harness can find nodes using semantic queries.
- [ ] Query by role only.
- [ ] Query by role and name.
- [ ] Missing match produces clear failure output.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
