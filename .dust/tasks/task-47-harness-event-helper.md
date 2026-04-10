# Task 47: Harness event helper

Implement Task 47: Harness event helper.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Tests can trigger bubble events through a high-level helper.

Cover the following tests in the same change:
- Click helper dispatches expected event.
- Missing target produces clear failure.
- Event helper returns dispatch result.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 46: Harness render helper](./task-46-harness-render-helper.md)

## Definition of Done

- [ ] Tests can trigger bubble events through a high-level helper.
- [ ] Click helper dispatches expected event.
- [ ] Missing target produces clear failure.
- [ ] Event helper returns dispatch result.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
