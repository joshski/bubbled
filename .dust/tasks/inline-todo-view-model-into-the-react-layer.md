---
name: Inline todo view model into the React layer
description: Move view model types and display logic from todo-store.ts into the React layer and merge todo-app.tsx into todo-react.ts
type: task
---

# Inline todo view model into the React layer

Move display-layer logic out of `todo-store.ts` and into the React component. Merge `todo-app.tsx` into `todo-react.ts`.

## Context

`todo-store.ts` exports `createTodoAppSnapshot`, `TodoAppSnapshot`, `TodoViewItem`, and `summarizeTodos` — all display concerns living in the data layer. All computed values are derived from data the React component already has. Moving this computation into the React layer removes the leaky abstraction.

Resolved design decisions:
- `TodoAppView` will receive raw `TodoItem[]` and `draft` — compute display strings inside `TodoAppView`
- Merge `todo-app.tsx` into `todo-react.ts` (eliminates the file boundary; `TodoAppView` has no other consumers)

## Steps

1. Delete `TodoAppSnapshot`, `TodoViewItem`, `createTodoAppSnapshot`, and `summarizeTodos` from `todo-store.ts`
2. Move the JSX component from `todo-app.tsx` into `todo-react.ts`, updating it to accept `todos: readonly TodoItem[]` and `draft: string` directly and compute all display strings inline
3. Delete `todo-app.tsx`
4. Update `TodoAppRoot` in `todo-react.ts` to pass `todos` and `draft` instead of a snapshot
5. Update `todo-react.test.ts` to remove any references to snapshot types (tests that drive the UI through events and check text/structure via the bubble query API remain valid)
6. Ensure `bunx dust check` passes

## Task Type

implement

## Blocked By

(none)

## Principles

- [Build Thin Tested Slices](./../principles/build-thin-tested-slices.md)

## Guidance

### Build Thin Tested Slices

Build the runtime one observable behavior at a time with tests in the same change.

Keep each task narrowly scoped, use deterministic semantics, reject unsupported behavior explicitly, and preserve full coverage while the repo is still small.

### Functional Core, Imperative Shell

Separate code into a pure "functional core" and a thin "imperative shell." The core takes values in and returns values out, with no side effects. The shell handles I/O and wires things together.

Purely functional code makes some things easier to understand: because values don't change, you can call functions and know that only their return value matters—they don't change anything outside themselves.

The functional core contains business logic as pure functions that take values and return values. The imperative shell sits at the boundary, reading input, calling into the core, and performing side effects with the results. This keeps the majority of code easy to test (no mocks or stubs needed for pure functions) and makes the I/O surface area small and explicit.

### Decoupled Code

Code should be organized into independent units with explicit dependencies.

Decoupled code is easier to test, understand, and modify. Dependencies are passed in rather than hard-coded, enabling units to be tested in isolation and composed flexibly. This reduces the blast radius of changes and makes the system more maintainable.

### Context-Optimised Code

Code should be structured so that agents can understand and modify it within their context window constraints.

Large files, deeply nested abstractions, and sprawling dependency chains all work against agents. A 3,000-line file cannot be fully loaded into context. A function that requires understanding six levels of indirection demands more context than one that is self-contained. Context-optimised code favours small files, shallow abstractions, explicit dependencies, and co-located related logic.

## Definition of Done

- `TodoAppSnapshot`, `TodoViewItem`, `createTodoAppSnapshot`, and `summarizeTodos` are removed from `todo-store.ts`
- `todo-app.tsx` is deleted; its component is merged into `todo-react.ts`
- `TodoAppView` (or equivalent inline component) computes all display strings from raw `TodoItem[]` and `draft`
- All tests pass and `bunx dust check` is green
