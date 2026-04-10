# Task 65: Real browser form verification

Implement Task 65: Real browser form verification.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Browser tests verify the first form behavior that depends on native browser behavior.

Cover the following tests in the same change:
- Use one narrow case, such as default submit behavior or checkbox serialization quirks.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 64: Real browser focus verification](./task-64-real-browser-focus-verification.md)

## Definition of Done

- [ ] Browser tests verify the first form behavior that depends on native browser behavior.
- [ ] Use one narrow case, such as default submit behavior or checkbox serialization quirks.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
