# Task 35: Label click forwarding

Implement Task 35: Label click forwarding.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Clicking a label forwards activation to its associated control.

Cover the following tests in the same change:
- Forward click to explicit target.
- Forward click to nested target.
- Verify event order if the contract defines it.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- None

## Definition of Done

- [ ] Clicking a label forwards activation to its associated control.
- [ ] Forward click to explicit target.
- [ ] Forward click to nested target.
- [ ] Verify event order if the contract defines it.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
