# Task 14: Roll back failed transactions

Implement Task 14: Roll back failed transactions.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- A failed transaction leaves the tree unchanged.

Cover the following tests in the same change:
- Throw during mutation application and verify no partial state leaks.
- Confirm node identities and child order are preserved after rollback.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

(none)

## Definition of Done

- [ ] A failed transaction leaves the tree unchanged.
- [ ] Throw during mutation application and verify no partial state leaks.
- [ ] Confirm node identities and child order are preserved after rollback.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
