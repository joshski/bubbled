# Task 10: Set and remove attributes

Implement Task 10: Set and remove attributes.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Elements support attribute mutation through bubble operations only.

Cover the following tests in the same change:
- Set new attribute.
- Update existing attribute.
- Remove attribute.
- Reject attributes on unsupported node types.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 09: Move a child node](./task-09-move-a-child-node.md)

## Definition of Done

- [ ] Elements support attribute mutation through bubble operations only.
- [ ] Set new attribute.
- [ ] Update existing attribute.
- [ ] Remove attribute.
- [ ] Reject attributes on unsupported node types.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
