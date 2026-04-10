# Task 43: Viewport capability

Implement Task 43: Viewport capability.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- The runtime can read a deterministic viewport model.

Cover the following tests in the same change:
- Default viewport.
- Override viewport.
- Subscribers see viewport changes if that is supported.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- None

## Definition of Done

- [ ] The runtime can read a deterministic viewport model.
- [ ] Default viewport.
- [ ] Override viewport.
- [ ] Subscribers see viewport changes if that is supported.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
