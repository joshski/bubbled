# Task 37: Submit event

Implement Task 37: Submit event.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Dispatching submit on a form emits a submit event and returns the serialized payload if not canceled.

Cover the following tests in the same change:
- Successful submit returns payload.
- `preventDefault` cancels the submit result.
- Invalid form target is rejected.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- None

## Definition of Done

- [ ] Dispatching submit on a form emits a submit event and returns the serialized payload if not canceled.
- [ ] Successful submit returns payload.
- [ ] `preventDefault` cancels the submit result.
- [ ] Invalid form target is rejected.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
