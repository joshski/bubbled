---
name: Make todo store helper functions private
description: Remove exports from toggleTodo, removeTodo, appendTodo, normalizeTodoLabel and migrate edge-case tests to store-level tests
type: task
---

# Make todo store helper functions private

`todo-store.ts` exports `toggleTodo`, `removeTodo`, `appendTodo`, and `normalizeTodoLabel` as named exports. These are implementation details of `createTodoStore` — callers outside the file interact with the store through its `toggle`, `remove`, and `add` methods, not by calling the helpers directly.

No file outside `todo-store.ts` imports any of these four functions.

## Task Type

implement

## Blocked By

(none)

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)
- Decoupled Code (core)
- Make Changes with Confidence (core)
- Comprehensive Test Coverage (core)

## Guidance

### Build Thin Tested Slices (local)

Build the runtime one observable behavior at a time with tests in the same change.

Keep each task narrowly scoped, use deterministic semantics, reject unsupported behavior explicitly, and preserve full coverage while the repo is still small.

### Decoupled Code (core)

Code should be organized into independent units with explicit dependencies.

Decoupled code is easier to test, understand, and modify. Dependencies are passed in rather than hard-coded, enabling units to be tested in isolation and composed flexibly. This reduces the blast radius of changes and makes the system more maintainable.

### Make Changes with Confidence (core)

Developers should be able to modify code without fear of breaking existing behavior.

Tests, type checking, and other automated verification enable safe refactoring and evolution of the codebase. When changes break something, fast feedback identifies the problem before it spreads. This confidence encourages continuous improvement rather than fragile, stagnant code.

### Comprehensive Test Coverage (core)

A project's test suite is its primary safety net, and agents depend on it even more than humans do.

Agents cannot manually verify that their changes work. They rely entirely on automated tests to confirm correctness. Gaps in test coverage become gaps in agent capability — areas where changes are risky and feedback is absent. Comprehensive coverage means every meaningful behaviour is tested, so agents can make changes anywhere in the codebase with confidence.

## Implementation Notes

- In `todo-store.ts`: remove `export` from `toggleTodo`, `removeTodo`, `appendTodo`, and `normalizeTodoLabel`
- In `todo-store.test.ts`: remove the `'pure todo helpers'` describe block
- Migrate any edge-case assertions not already covered by `createTodoStore` tests (e.g. blank-label guard in `appendTodo`) into the `createTodoStore` describe block
- Update the import list in `todo-store.test.ts` to remove the now-unexported names

## Definition of Done

- `toggleTodo`, `removeTodo`, `appendTodo`, and `normalizeTodoLabel` are no longer exported from `todo-store.ts`
- All edge cases previously tested in `'pure todo helpers'` are covered by `createTodoStore` tests
- `bunx dust check` passes
