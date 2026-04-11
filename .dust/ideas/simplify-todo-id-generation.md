---
name: Simplify todo ID generation
description: Replace the regex-based createNextTodoId with a simpler approach
type: idea
---

# Simplify todo ID generation

`createNextTodoId` in `todo-store.ts` finds the max numeric suffix across all existing IDs using a regex, then increments it. This is more complex than necessary for an example app.

## Context

```ts
function createNextTodoId(todos: readonly TodoItem[]): string {
  let maxId = 0
  for (const todo of todos) {
    const match = /^t(\d+)$/.exec(todo.id)
    if (match === null) { continue }
    maxId = Math.max(maxId, Number(match[1]))
  }
  return `t${maxId + 1}`
}
```

The regex handles IDs that don't match the `t<n>` pattern (skipping them), and finds a gap-free max. This is defensive code for a scenario that can't arise in a closed example — the only code path that creates IDs is `createNextTodoId` itself.

The tests in `todo-store.test.ts` check that the ID assigned to a new todo continues from the highest existing ID (e.g. `t2` → `t3`). This test would need to change along with the implementation.

## Proposed Change

Replace with `t${todos.length + 1}` or a simpler length-based counter. IDs only need to be unique within the list; strict monotonic max is unnecessary.

## Open Questions

### What should the new ID strategy be?

#### Option: `t${todos.length + 1}`
Simple. Produces the same IDs as the current implementation when no deletions have happened. After a deletion, IDs may repeat if items are added back (e.g. delete `t2`, add a new item → new item also gets `t2`). For the example app this is inconsequential.

#### Option: `t${todos.length + 1}` with a note that IDs can repeat after deletions
Same as above but document the trade-off in a comment.

#### Option: Use a module-level counter
`let nextId = 1; return \`t${nextId++}\`` — monotonically increasing, never repeats, but leaks state outside the store. Less pure.
