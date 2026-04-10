# Task 63: Layout-sensitive browser verification tests

Implement Task 63: Layout-sensitive browser verification tests.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Real browser tests validate the first layout-dependent feature that the bubble cannot model fully.

Cover the following tests in the same change:
- Pick one concrete feature, such as popover placement.
- Verify both bubble-side pure logic and browser-side final integration.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- None

## Definition of Done

- [ ] Real browser tests validate the first layout-dependent feature that the bubble cannot model fully.
- [ ] Pick one concrete feature, such as popover placement.
- [ ] Verify both bubble-side pure logic and browser-side final integration.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
