# Task 61: Stream subscriptions

Implement Task 61: Stream subscriptions.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- Control clients can subscribe to mutations, events, and errors.

Cover the following tests in the same change:
- Subscriber receives records in order.
- Unsubscribe stops delivery.
- Multiple subscribers are isolated.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Task 60: Command/query separation](./task-60-commandquery-separation.md)

## Definition of Done

- [ ] Control clients can subscribe to mutations, events, and errors.
- [ ] Subscriber receives records in order.
- [ ] Unsubscribe stops delivery.
- [ ] Multiple subscribers are isolated.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
