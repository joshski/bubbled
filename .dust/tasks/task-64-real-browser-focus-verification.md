# Task 64: Real browser focus verification

Implement Task 64: Real browser focus verification.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Browser tests verify the first focus behavior where browser semantics matter more than the bubble model.

Cover the following tests in the same change:
- Use one narrow case, such as label/input focus transfer or tab order edge cases.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 63: Layout-sensitive browser verification tests](./task-63-layout-sensitive-browser-verification-tests.md)

## Definition of Done

- [ ] Browser tests verify the first focus behavior where browser semantics matter more than the bubble model.
- [ ] Use one narrow case, such as label/input focus transfer or tab order edge cases.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
