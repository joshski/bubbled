# Task 09: Move a child node

Implement Task 09: Move a child node.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Existing children can be reordered without replacing identity.

Cover the following tests in the same change:
- Move forward and backward.
- Node ID remains unchanged after move.
- Reject moves with invalid indices.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

(none)

## Definition of Done

- [ ] Existing children can be reordered without replacing identity.
- [ ] Move forward and backward.
- [ ] Node ID remains unchanged after move.
- [ ] Reject moves with invalid indices.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
