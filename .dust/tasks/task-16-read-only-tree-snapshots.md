# Task 16: Read-only tree snapshots

Implement Task 16: Read-only tree snapshots.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Callers can inspect the current tree through a stable, read-only snapshot API.

Cover the following tests in the same change:
- Snapshot contains current structure.
- Snapshot updates after commit.
- Mutating snapshot data does not mutate runtime state.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

(none)

## Definition of Done

- [ ] Callers can inspect the current tree through a stable, read-only snapshot API.
- [ ] Snapshot contains current structure.
- [ ] Snapshot updates after commit.
- [ ] Mutating snapshot data does not mutate runtime state.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
