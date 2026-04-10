# Task 29: Basic role derivation

Implement Task 29: Basic role derivation.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Elements expose derived semantic roles for core HTML controls.

Cover the following tests in the same change:
- Button role.
- Link role.
- Textbox role.
- Unknown elements fall back predictably.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 28: Query by node ID and simple selectors](./task-28-query-by-node-id-and-simple-selectors.md)

## Definition of Done

- [ ] Elements expose derived semantic roles for core HTML controls.
- [ ] Button role.
- [ ] Link role.
- [ ] Textbox role.
- [ ] Unknown elements fall back predictably.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
