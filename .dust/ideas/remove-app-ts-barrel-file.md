---
name: Remove app.ts barrel file
description: Delete the unused app.ts re-export barrel in the todo example
type: idea
---

# Remove app.ts barrel file

`examples/todo-app/app.ts` re-exports from `server.ts`, `todo-react.ts`, and `todo-browser.ts`, but nothing in the repository imports from it. It is dead code.

## Context

```ts
// app.ts — current content
export { createTodoApiResponse, handleTodoFallbackRequest, ... } from './server.ts'
export { mountTodoApp, ... } from './todo-react.ts'
export { startTodoApp, ... } from './todo-browser.ts'
```

Callers import directly:
- `main.ts` imports from `./server.ts`
- `client.ts` imports from `./todo-browser.ts`
- Tests import from specific files

The barrel adds a file and a layer of indirection with no consumers.

## Proposed Change

Delete `examples/todo-app/app.ts`.
