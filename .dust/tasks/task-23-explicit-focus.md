# Task 23: Explicit focus

Implement Task 23: Explicit focus.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- `focus(nodeId)` marks one node as focused.

Cover the following tests in the same change:
- Focusing a focusable node sets active focus.
- Focusing a second node clears the first.
- Reject non-focusable targets.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 22: Listener error handling](./task-22-listener-error-handling.md)

## Definition of Done

- [ ] `focus(nodeId)` marks one node as focused.
- [ ] Focusing a focusable node sets active focus.
- [ ] Focusing a second node clears the first.
- [ ] Reject non-focusable targets.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
