# Task 27: Simulated tab navigation

Implement Task 27: Simulated tab navigation.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- The test harness can advance focus using tab semantics.

Cover the following tests in the same change:
- Forward tab progression.
- Wrap or stop behavior according to contract.
- Shift+Tab if included in v1.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- Task 26: Basic tab order

## Definition of Done

- [ ] The test harness can advance focus using tab semantics.
- [ ] Forward tab progression.
- [ ] Wrap or stop behavior according to contract.
- [ ] Shift+Tab if included in v1.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
