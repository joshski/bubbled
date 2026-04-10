# Task 38: Capability registry

Implement Task 38: Capability registry.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- A bubble instance can be created with explicit capabilities.

Cover the following tests in the same change:
- Registered capability can be resolved.
- Missing capability throws a named unsupported error.
- Instances do not share capability state accidentally.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 37: Submit event](./task-37-submit-event.md)

## Definition of Done

- [ ] A bubble instance can be created with explicit capabilities.
- [ ] Registered capability can be resolved.
- [ ] Missing capability throws a named unsupported error.
- [ ] Instances do not share capability state accidentally.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
