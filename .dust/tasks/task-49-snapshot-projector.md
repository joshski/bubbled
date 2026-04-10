# Task 49: Snapshot projector

Implement Task 49: Snapshot projector.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- The bubble tree can be projected to a stable serialized format.

Cover the following tests in the same change:
- Snapshot contains tree structure.
- Attributes, properties, and text serialize correctly.
- Snapshot order is deterministic.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 48: Harness semantic assertions](./task-48-harness-semantic-assertions.md)

## Definition of Done

- [ ] The bubble tree can be projected to a stable serialized format.
- [ ] Snapshot contains tree structure.
- [ ] Attributes, properties, and text serialize correctly.
- [ ] Snapshot order is deterministic.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
