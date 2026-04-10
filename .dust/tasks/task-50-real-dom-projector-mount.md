# Task 50: Real DOM projector mount

Implement Task 50: Real DOM projector mount.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- The bubble tree can mount into a real DOM container.

Cover the following tests in the same change:
- Initial mount creates expected DOM.
- Text and attributes appear correctly.
- Cleanup removes projected nodes.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- None

## Definition of Done

- [ ] The bubble tree can mount into a real DOM container.
- [ ] Initial mount creates expected DOM.
- [ ] Text and attributes appear correctly.
- [ ] Cleanup removes projected nodes.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
