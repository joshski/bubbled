# Task 28: Query by node ID and simple selectors

Implement Task 28: Query by node ID and simple selectors.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Callers can locate nodes via stable IDs and a minimal query API.

Cover the following tests in the same change:
- Query existing and missing nodes.
- Query by tag.
- Query returns read-only views.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- None

## Definition of Done

- [ ] Callers can locate nodes via stable IDs and a minimal query API.
- [ ] Query existing and missing nodes.
- [ ] Query by tag.
- [ ] Query returns read-only views.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
