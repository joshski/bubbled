# Task 41: Microtask or scheduler queue

Implement Task 41: Microtask or scheduler queue.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- The runtime can queue deterministic deferred work.

Cover the following tests in the same change:
- Queue and flush scheduled work.
- Work ordering is explicit and tested.
- Re-entrant scheduling behavior is covered.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 40: Timer capability](./task-40-timer-capability.md)

## Definition of Done

- [ ] The runtime can queue deterministic deferred work.
- [ ] Queue and flush scheduled work.
- [ ] Work ordering is explicit and tested.
- [ ] Re-entrant scheduling behavior is covered.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
