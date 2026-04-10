# Task 42: Layout capability as an explicit seam

Implement Task 42: Layout capability as an explicit seam.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Layout reads go through a capability interface and throw unless mocked.

Cover the following tests in the same change:
- Unconfigured layout read throws.
- Mocked layout returns configured geometry.
- Call arguments are captured for assertion.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- None

## Definition of Done

- [ ] Layout reads go through a capability interface and throw unless mocked.
- [ ] Unconfigured layout read throws.
- [ ] Mocked layout returns configured geometry.
- [ ] Call arguments are captured for assertion.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
