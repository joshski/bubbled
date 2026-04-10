# Task 53: Projected focus sync

Implement Task 53: Projected focus sync.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Focus state can stay synchronized between bubble and projected DOM.

Cover the following tests in the same change:
- Bubble focus updates DOM focus.
- DOM focus event updates bubble focus if that path is supported.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 52: DOM-to-bubble event bridge](./task-52-dom-to-bubble-event-bridge.md)

## Definition of Done

- [ ] Focus state can stay synchronized between bubble and projected DOM.
- [ ] Bubble focus updates DOM focus.
- [ ] DOM focus event updates bubble focus if that path is supported.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
