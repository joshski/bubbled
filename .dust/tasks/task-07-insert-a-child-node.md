# Task 07: Insert a child node

Implement Task 07: Insert a child node.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- A child can be inserted into a parent at a specific index.

Cover the following tests in the same change:
- Insert into empty parent.
- Insert at front, middle, and end.
- Reject insert into invalid parent types.
- Reject cross-instance insertion.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

(none)

## Definition of Done

- [ ] A child can be inserted into a parent at a specific index.
- [ ] Insert into empty parent.
- [ ] Insert at front, middle, and end.
- [ ] Reject insert into invalid parent types.
- [ ] Reject cross-instance insertion.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
