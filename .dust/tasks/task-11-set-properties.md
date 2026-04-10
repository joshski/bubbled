# Task 11: Set properties

Implement Task 11: Set properties.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Elements support explicit property mutation separate from attributes.

Cover the following tests in the same change:
- Property set and overwrite.
- Attribute and property storage are independent.
- Reject unsupported property targets.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 10: Set and remove attributes](./task-10-set-and-remove-attributes.md)

## Definition of Done

- [ ] Elements support explicit property mutation separate from attributes.
- [ ] Property set and overwrite.
- [ ] Attribute and property storage are independent.
- [ ] Reject unsupported property targets.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
