# Task 24: Blur

Implement Task 24: Blur.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- `blur()` clears active focus.

Cover the following tests in the same change:
- Blur clears focus when one node is active.
- Blur is safe when nothing is focused.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- None

## Definition of Done

- [ ] `blur()` clears active focus.
- [ ] Blur clears focus when one node is active.
- [ ] Blur is safe when nothing is focused.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
