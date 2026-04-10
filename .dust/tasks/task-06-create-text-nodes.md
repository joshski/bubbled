# Task 06: Create text nodes

Implement Task 06: Create text nodes.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- The runtime can create text nodes.

Cover the following tests in the same change:
- Text node shape is correct.
- Empty text is allowed if that is the chosen contract.
- Invalid text input is rejected.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 05: Create element nodes](./task-05-create-element-nodes.md)

## Definition of Done

- [ ] The runtime can create text nodes.
- [ ] Text node shape is correct.
- [ ] Empty text is allowed if that is the chosen contract.
- [ ] Invalid text input is rejected.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
