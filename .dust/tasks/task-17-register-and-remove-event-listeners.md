# Task 17: Register and remove event listeners

Implement Task 17: Register and remove event listeners.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Elements can add and remove listeners for named events.

Cover the following tests in the same change:
- Add listener and receive event.
- Remove listener and verify it no longer fires.
- Multiple listeners on the same node fire in registration order.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

(none)

## Definition of Done

- [ ] Elements can add and remove listeners for named events.
- [ ] Add listener and receive event.
- [ ] Remove listener and verify it no longer fires.
- [ ] Multiple listeners on the same node fire in registration order.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
