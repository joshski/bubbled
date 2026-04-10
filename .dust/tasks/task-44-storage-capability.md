# Task 44: Storage capability

Implement Task 44: Storage capability.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- The runtime can access deterministic storage through an interface.

Cover the following tests in the same change:
- Read missing key.
- Write and read back.
- Per-session isolation.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 43: Viewport capability](./task-43-viewport-capability.md)

## Definition of Done

- [ ] The runtime can access deterministic storage through an interface.
- [ ] Read missing key.
- [ ] Write and read back.
- [ ] Per-session isolation.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
