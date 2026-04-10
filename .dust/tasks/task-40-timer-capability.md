# Task 40: Timer capability

Implement Task 40: Timer capability.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Timeout scheduling runs against the injected clock.

Cover the following tests in the same change:
- Timer fires only after advancement.
- Multiple timers fire in order.
- Cancelled timers do not fire.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- None

## Definition of Done

- [ ] Timeout scheduling runs against the injected clock.
- [ ] Timer fires only after advancement.
- [ ] Multiple timers fire in order.
- [ ] Cancelled timers do not fire.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
