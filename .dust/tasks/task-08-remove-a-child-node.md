# Task 08: Remove a child node

Implement Task 08: Remove a child node.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- A child can be removed from its parent.

Cover the following tests in the same change:
- Remove only child.
- Remove first, middle, and last child.
- Removed node is detached cleanly.
- Reject removing a node that is not a child of the parent.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 07: Insert a child node](./task-07-insert-a-child-node.md)

## Definition of Done

- [ ] A child can be removed from its parent.
- [ ] Remove only child.
- [ ] Remove first, middle, and last child.
- [ ] Removed node is detached cleanly.
- [ ] Reject removing a node that is not a child of the parent.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
