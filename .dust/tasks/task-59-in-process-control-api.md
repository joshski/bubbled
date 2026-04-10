# Task 59: In-process control API

Implement Task 59: In-process control API.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- A session API can create, reset, inspect, and destroy bubble instances.

Cover the following tests in the same change:
- Create session.
- Reset session.
- Destroy session and reject further use.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 58: React keyed reordering](./task-58-react-keyed-reordering.md)

## Definition of Done

- [ ] A session API can create, reset, inspect, and destroy bubble instances.
- [ ] Create session.
- [ ] Reset session.
- [ ] Destroy session and reject further use.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
