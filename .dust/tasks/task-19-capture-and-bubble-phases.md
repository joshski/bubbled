# Task 19: Capture and bubble phases

Implement Task 19: Capture and bubble phases.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Event propagation follows capture then target then bubble.

Cover the following tests in the same change:
- Parent capture runs before target.
- Parent bubble runs after target.
- Current target is correct at each step.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 18: Dispatch events to a target](./task-18-dispatch-events-to-a-target.md)

## Definition of Done

- [ ] Event propagation follows capture then target then bubble.
- [ ] Parent capture runs before target.
- [ ] Parent bubble runs after target.
- [ ] Current target is correct at each step.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
