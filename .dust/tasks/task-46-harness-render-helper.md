# Task 46: Harness render helper

Implement Task 46: Harness render helper.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Tests can render a bubble tree through a small harness API instead of manual node operations.

Cover the following tests in the same change:
- Render root content.
- Re-render replaces or updates according to contract.
- Harness cleanup resets state.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 45: Network capability](./task-45-network-capability.md)

## Definition of Done

- [ ] Tests can render a bubble tree through a small harness API instead of manual node operations.
- [ ] Render root content.
- [ ] Re-render replaces or updates according to contract.
- [ ] Harness cleanup resets state.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
