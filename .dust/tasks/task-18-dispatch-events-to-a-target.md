# Task 18: Dispatch events to a target

Implement Task 18: Dispatch events to a target.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- The runtime can dispatch an event at a specific node.

Cover the following tests in the same change:
- Target listener receives event data.
- Dispatch to missing node fails clearly.
- Event object exposes type and target.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 17: Register and remove event listeners](./task-17-register-and-remove-event-listeners.md)

## Definition of Done

- [ ] The runtime can dispatch an event at a specific node.
- [ ] Target listener receives event data.
- [ ] Dispatch to missing node fails clearly.
- [ ] Event object exposes type and target.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
