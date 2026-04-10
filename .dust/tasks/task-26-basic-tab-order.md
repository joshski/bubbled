# Task 26: Basic tab order

Implement Task 26: Basic tab order.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- The runtime can compute tab order for simple focusable elements.

Cover the following tests in the same change:
- Natural DOM order.
- `tabIndex` overrides where supported.
- Disabled elements are skipped.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 25: Focus and blur events](./task-25-focus-and-blur-events.md)

## Definition of Done

- [ ] The runtime can compute tab order for simple focusable elements.
- [ ] Natural DOM order.
- [ ] `tabIndex` overrides where supported.
- [ ] Disabled elements are skipped.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
