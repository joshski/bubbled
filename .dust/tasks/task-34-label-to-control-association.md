# Task 34: Label to control association

Implement Task 34: Label to control association.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Labels can resolve their associated control.

Cover the following tests in the same change:
- Explicit `for` association.
- Nested control association.
- Missing control fails cleanly.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- None

## Definition of Done

- [ ] Labels can resolve their associated control.
- [ ] Explicit `for` association.
- [ ] Nested control association.
- [ ] Missing control fails cleanly.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
