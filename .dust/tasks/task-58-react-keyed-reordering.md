# Task 58: React keyed reordering

Implement Task 58: React keyed reordering.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- React keyed children reorder through bubble move operations rather than full replacement where possible.

Cover the following tests in the same change:
- Keyed reorder preserves node identity.
- Removed key detaches node cleanly.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 57: React state updates](./task-57-react-state-updates.md)

## Definition of Done

- [ ] React keyed children reorder through bubble move operations rather than full replacement where possible.
- [ ] Keyed reorder preserves node identity.
- [ ] Removed key detaches node cleanly.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
