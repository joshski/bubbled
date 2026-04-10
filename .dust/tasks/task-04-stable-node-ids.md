# Task 04: Stable node IDs

Implement Task 04: Stable node IDs.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Every node created by the bubble gets a stable ID owned by the bubble.

Cover the following tests in the same change:
- IDs are unique within an instance.
- IDs remain stable across read operations.
- IDs are not reused after node removal in the same session.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

(none)

## Definition of Done

- [ ] Every node created by the bubble gets a stable ID owned by the bubble.
- [ ] IDs are unique within an instance.
- [ ] IDs remain stable across read operations.
- [ ] IDs are not reused after node removal in the same session.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
