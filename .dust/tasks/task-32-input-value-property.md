# Task 32: Input value property

Implement Task 32: Input value property.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Text inputs store and expose a value property.

Cover the following tests in the same change:
- Default empty value.
- Set value.
- Reject value on non-input nodes if that is the contract.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 31: Query by role and name](./task-31-query-by-role-and-name.md)

## Definition of Done

- [ ] Text inputs store and expose a value property.
- [ ] Default empty value.
- [ ] Set value.
- [ ] Reject value on non-input nodes if that is the contract.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
