# Task 36: Form submission payload

Implement Task 36: Form submission payload.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Forms can serialize their controls into a deterministic payload.

Cover the following tests in the same change:
- Text input submission.
- Checkbox inclusion rules.
- Disabled controls excluded.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 35: Label click forwarding](./task-35-label-click-forwarding.md)

## Definition of Done

- [ ] Forms can serialize their controls into a deterministic payload.
- [ ] Text input submission.
- [ ] Checkbox inclusion rules.
- [ ] Disabled controls excluded.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
