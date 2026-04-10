# Task 30: Accessible name derivation

Implement Task 30: Accessible name derivation.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Core controls expose an accessible name from text content or `aria-label`.

Cover the following tests in the same change:
- Name from text.
- Name from `aria-label`.
- Attribute precedence is explicit and tested.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 29: Basic role derivation](./task-29-basic-role-derivation.md)

## Definition of Done

- [ ] Core controls expose an accessible name from text content or `aria-label`.
- [ ] Name from text.
- [ ] Name from `aria-label`.
- [ ] Attribute precedence is explicit and tested.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
