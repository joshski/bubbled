# Task 22: Listener error handling

Implement Task 22: Listener error handling.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Listener exceptions do not corrupt runtime state and are surfaced consistently.

Cover the following tests in the same change:
- Thrown listener error is captured or rethrown according to contract.
- Later listeners run or do not run according to the chosen policy.
- Tree state remains unchanged.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 21: `preventDefault`](./task-21-preventdefault.md)

## Definition of Done

- [ ] Listener exceptions do not corrupt runtime state and are surfaced consistently.
- [ ] Thrown listener error is captured or rethrown according to contract.
- [ ] Later listeners run or do not run according to the chosen policy.
- [ ] Tree state remains unchanged.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
