# Task 56: React event handlers

Implement Task 56: React event handlers.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Bubble events can trigger React handlers.

Cover the following tests in the same change:
- Click handler fires.
- Handler receives expected event shape.
- Removed handler no longer fires.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 55: React prop updates](./task-55-react-prop-updates.md)

## Definition of Done

- [ ] Bubble events can trigger React handlers.
- [ ] Click handler fires.
- [ ] Handler receives expected event shape.
- [ ] Removed handler no longer fires.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
