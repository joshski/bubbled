# Task 03: Create an empty bubble instance

Implement Task 03: Create an empty bubble instance.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- `createBubble()` returns a root node with no children and stable root metadata.

Cover the following tests in the same change:
- Root exists and has the expected shape.
- Two bubble instances do not share state.
- External callers cannot mutate internal state by accident.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

(none)

## Definition of Done

- [ ] `createBubble()` returns a root node with no children and stable root metadata.
- [ ] Root exists and has the expected shape.
- [ ] Two bubble instances do not share state.
- [ ] External callers cannot mutate internal state by accident.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
