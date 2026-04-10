# Task 55: React prop updates

Implement Task 55: React prop updates.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- React updates map to bubble attribute, property, and text mutations.

Cover the following tests in the same change:
- Prop change updates bubble tree.
- Removed prop is removed in bubble.
- Unchanged nodes keep identity where expected.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- Task 54: Minimal React host mount

## Definition of Done

- [ ] React updates map to bubble attribute, property, and text mutations.
- [ ] Prop change updates bubble tree.
- [ ] Removed prop is removed in bubble.
- [ ] Unchanged nodes keep identity where expected.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
