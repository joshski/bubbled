# Task 13: Begin and commit transactions

Implement Task 13: Begin and commit transactions.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Mutations happen inside a transaction boundary and become visible on commit.

Cover the following tests in the same change:
- Uncommitted changes are not visible to subscribers.
- Committed changes are visible atomically.
- Nested transactions are either supported or rejected explicitly.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 12: Update text node content](./task-12-update-text-node-content.md)

## Definition of Done

- [ ] Mutations happen inside a transaction boundary and become visible on commit.
- [ ] Uncommitted changes are not visible to subscribers.
- [ ] Committed changes are visible atomically.
- [ ] Nested transactions are either supported or rejected explicitly.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
