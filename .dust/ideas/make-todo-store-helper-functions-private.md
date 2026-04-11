---
name: Make todo store helper functions private
description: Un-export toggleTodo, removeTodo, appendTodo, and normalizeTodoLabel from todo-store.ts
type: idea
---

# Make todo store helper functions private

`todo-store.ts` exports `toggleTodo`, `removeTodo`, `appendTodo`, and `normalizeTodoLabel` as named exports. These are implementation details of `createTodoStore` — callers outside the file interact with the store through its `toggle`, `remove`, and `add` methods, not by calling the helpers directly.

## Context

The exported helpers are tested in `todo-store.test.ts` under a `'pure todo helpers'` describe block. The same behaviors are exercised indirectly by the `createTodoStore` tests in the same file and by `todo-react.test.ts`. The direct tests add coverage for edge cases (e.g. blank label normalization), but these can be preserved as store-level tests.

No file outside `todo-store.ts` imports any of these four functions.

## Proposed Change

- Remove `export` from `toggleTodo`, `removeTodo`, `appendTodo`, and `normalizeTodoLabel`
- Remove the `'pure todo helpers'` describe block from `todo-store.test.ts`
- Merge any edge-case assertions not already covered (e.g. blank-label guard in `appendTodo`) into the `createTodoStore` tests
- Update the import list in `todo-store.test.ts`
