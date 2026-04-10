# Task 20: `stopPropagation`

Implement Task 20: stopPropagation.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- A listener can stop further propagation.

Cover the following tests in the same change:
- Stop during capture.
- Stop at target.
- Ensure already-run listeners are not rewound.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 19: Capture and bubble phases](./task-19-capture-and-bubble-phases.md)

## Definition of Done

- [ ] A listener can stop further propagation.
- [ ] Stop during capture.
- [ ] Stop at target.
- [ ] Ensure already-run listeners are not rewound.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
