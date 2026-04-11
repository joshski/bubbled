---
name: Inline todo view model into the React layer
description: Remove TodoAppSnapshot, TodoViewItem, and createTodoAppSnapshot from todo-store.ts
type: idea
---

# Inline todo view model into the React layer

`todo-store.ts` exports `createTodoAppSnapshot` and two types (`TodoAppSnapshot`, `TodoViewItem`) that build a "view model" consumed only by the React component. These are display-layer concerns living in the data layer.

## Context

`createTodoAppSnapshot` computes:
- `heading` — hardcoded string `'Bubbled Todos'`
- `summary` — delegated to `summarizeTodos(todos)`
- `addButtonLabel` — hardcoded string `'Add todo'`
- `newTodoLabel` — hardcoded string `'New todo'`
- `canAdd` — `normalizeTodoLabel(draft).length > 0`
- `todos` — each `TodoItem` mapped to a `TodoViewItem` with `toggleLabel`, `toggleText`, `removeLabel`

All of these are derived from data the React component already has (`todos` from the store and `draft` from state). Moving this computation into the React layer removes the snapshot types entirely and collapses `todo-store.ts` to pure data concerns.

`summarizeTodos` can move to `todo-react.ts` or be inlined into the component.

## Proposed Change

- Delete `TodoAppSnapshot`, `TodoViewItem`, `createTodoAppSnapshot`, and `summarizeTodos` from `todo-store.ts`
- Update `TodoAppView` props and `TodoAppRoot` to compute display strings inline
- Update `todo-react.test.ts` to remove references to snapshot shape (tests already drive the UI through events and check text/structure via the bubble query API — these remain valid)

## Open Questions

### Should `TodoAppView` receive raw `TodoItem[]` or computed display props?

#### Option: Pass raw `TodoItem[]` and `draft` — compute display strings inside `TodoAppView`
`TodoAppView` becomes self-contained. No props interface change needed in `TodoAppRoot`. Simplest.

#### Option: Keep a flat props interface on `TodoAppView` but compute inside `TodoAppRoot`
`TodoAppView` stays a "dumb" presenter. Logic moves into `TodoAppRoot` but the seam is preserved.

### Should `TodoAppView` be merged into `TodoAppRoot`?

#### Option: Merge `todo-app.tsx` into `todo-react.ts`
Eliminates the file boundary between the view and its controller. `TodoAppView` has no other consumers.

#### Option: Keep `TodoAppView` in its own file
Preserves the visual separation between presentation and wiring, even if only used in one place.
