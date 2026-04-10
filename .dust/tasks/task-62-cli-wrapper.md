# Task 62: CLI wrapper

Implement Task 62: CLI wrapper.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- A CLI can invoke the control API for one-shot commands.

Cover the following tests in the same change:
- Human-readable output mode.
- JSON output mode.
- Exit code behavior on success and failure.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 61: Stream subscriptions](./task-61-stream-subscriptions.md)

## Definition of Done

- [ ] A CLI can invoke the control API for one-shot commands.
- [ ] Human-readable output mode.
- [ ] JSON output mode.
- [ ] Exit code behavior on success and failure.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
