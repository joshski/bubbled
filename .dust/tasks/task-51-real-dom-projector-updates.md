# Task 51: Real DOM projector updates

Implement Task 51: Real DOM projector updates.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Bubble mutations update the projected DOM incrementally.

Cover the following tests in the same change:
- Insert, remove, move, and text updates reflect in DOM.
- Node identity is preserved where expected.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- None

## Definition of Done

- [ ] Bubble mutations update the projected DOM incrementally.
- [ ] Insert, remove, move, and text updates reflect in DOM.
- [ ] Node identity is preserved where expected.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
