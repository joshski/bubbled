# Task 15: Mutation records

Implement Task 15: Mutation records.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Committed changes produce a deterministic mutation record stream.

Cover the following tests in the same change:
- Single-op transaction record.
- Multi-op transaction record ordering.
- Empty transactions emit nothing or an explicit no-op record, whichever is chosen.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

(none)

## Definition of Done

- [ ] Committed changes produce a deterministic mutation record stream.
- [ ] Single-op transaction record.
- [ ] Multi-op transaction record ordering.
- [ ] Empty transactions emit nothing or an explicit no-op record, whichever is chosen.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
