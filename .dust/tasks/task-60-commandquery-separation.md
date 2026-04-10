# Task 60: Command/query separation

Implement Task 60: Command/query separation.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Control operations are exposed as commands and queries with explicit result types.

Cover the following tests in the same change:
- Command mutates state.
- Query reads state without mutation.
- Invalid command returns structured error.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- Task 59: In-process control API

## Definition of Done

- [ ] Control operations are exposed as commands and queries with explicit result types.
- [ ] Command mutates state.
- [ ] Query reads state without mutation.
- [ ] Invalid command returns structured error.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
