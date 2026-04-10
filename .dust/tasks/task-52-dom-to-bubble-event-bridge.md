# Task 52: DOM-to-bubble event bridge

Implement Task 52: DOM-to-bubble event bridge.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Browser DOM events can be translated back into bubble events.

Cover the following tests in the same change:
- Click in DOM reaches bubble listener.
- Event target mapping is correct.
- Unknown DOM targets fail safely.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 51: Real DOM projector updates](./task-51-real-dom-projector-updates.md)

## Definition of Done

- [ ] Browser DOM events can be translated back into bubble events.
- [ ] Click in DOM reaches bubble listener.
- [ ] Event target mapping is correct.
- [ ] Unknown DOM targets fail safely.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
