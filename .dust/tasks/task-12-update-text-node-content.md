# Task 12: Update text node content

Implement Task 12: Update text node content.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Text nodes can be updated in place.

Cover the following tests in the same change:
- Text updates preserve node identity.
- Empty string handling is correct.
- Reject text updates on element nodes.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 11: Set properties](./task-11-set-properties.md)

## Definition of Done

- [ ] Text nodes can be updated in place.
- [ ] Text updates preserve node identity.
- [ ] Empty string handling is correct.
- [ ] Reject text updates on element nodes.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
