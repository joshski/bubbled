# Task 21: `preventDefault`

Implement Task 21: preventDefault.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- A listener can cancel default handling and the dispatch result reflects that.

Cover the following tests in the same change:
- Default prevented state is visible to later listeners.
- Dispatch result reports cancellation.
- Non-cancelable events behave as specified.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 20: `stopPropagation`](./task-20-stoppropagation.md)

## Definition of Done

- [ ] A listener can cancel default handling and the dispatch result reflects that.
- [ ] Default prevented state is visible to later listeners.
- [ ] Dispatch result reports cancellation.
- [ ] Non-cancelable events behave as specified.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
