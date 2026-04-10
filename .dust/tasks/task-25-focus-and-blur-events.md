# Task 25: Focus and blur events

Implement Task 25: Focus and blur events.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Focus changes emit the appropriate events in a deterministic order.

Cover the following tests in the same change:
- Focus event fires on focus target.
- Blur event fires on previous target.
- Switching focus produces the agreed ordering.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- None

## Definition of Done

- [ ] Focus changes emit the appropriate events in a deterministic order.
- [ ] Focus event fires on focus target.
- [ ] Blur event fires on previous target.
- [ ] Switching focus produces the agreed ordering.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
