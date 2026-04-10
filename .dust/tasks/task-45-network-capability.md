# Task 45: Network capability

Implement Task 45: Network capability.

Use `API_SKETCHES.md` as reference for the intended package boundaries, naming, and public surface while keeping this change limited to the smallest observable behavior needed for this slice.

Implement the following behavior from `IMPLEMENTATION_BREAKDOWN.md`:
- The runtime can issue scripted network requests through an injected interface.

Cover the following tests in the same change:
- Successful response.
- Error response.
- Unscripted request fails loudly.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- None

## Definition of Done

- [ ] The runtime can issue scripted network requests through an injected interface.
- [ ] Successful response.
- [ ] Error response.
- [ ] Unscripted request fails loudly.
- [ ] `API_SKETCHES.md` has been used as the reference for any public API names or package boundaries touched by this task.
- [ ] Repo coverage remains at 100% after this task lands.
