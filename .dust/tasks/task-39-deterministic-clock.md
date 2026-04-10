# Task 39: Deterministic clock

Implement Task 39: Deterministic clock.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- The runtime can use an injected clock instead of ambient time.

Cover the following tests in the same change:
- `now()` returns fake time.
- Advancing fake time updates reads deterministically.
- No implicit `Date.now()` usage leaks into tests.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 38: Capability registry](./task-38-capability-registry.md)

## Definition of Done

- [ ] The runtime can use an injected clock instead of ambient time.
- [ ] `now()` returns fake time.
- [ ] Advancing fake time updates reads deterministically.
- [ ] No implicit `Date.now()` usage leaks into tests.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
