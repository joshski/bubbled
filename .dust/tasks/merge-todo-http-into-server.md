# Merge todo-http into server

Consolidate the todo example's two server-side files (`todo-http.ts` and `server.ts`) into a single `server.ts` module. Delete `todo-http.ts` and its test file once the content has been merged.

## Why This Matters

The current split divides a very small HTTP surface across two files without providing any ergonomic benefit. A reader exploring the example has to open both files to understand how the server works. Merging them makes the server shell readable in a single pass.

## Current Context

- `examples/todo-app/todo-http.ts` exports route constants and handlers for the `/api/todos` endpoint and the page fallback.
- `examples/todo-app/server.ts` re-exports those constants and handlers and calls `Bun.serve()`.
- `examples/todo-app/todo-http.test.ts` tests the HTTP helper layer independently.
- `examples/todo-app/server.test.ts` tests the Bun server integration.
- Both files together are a very small total surface; merging them will not make `server.ts` large.

## Scope

- Move the route constants, request handlers, and any helper logic from `todo-http.ts` directly into `server.ts`.
- Delete `todo-http.ts` and `todo-http.test.ts`.
- Keep server behavior and the `/api/todos` response identical (no behavioral changes).
- Merge any useful test coverage from `todo-http.test.ts` into `server.test.ts` so that test surface is not lost.
- Do not change any other example files.

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)
- Small Units
- Functional Core, Imperative Shell

## Guidance

### Build Thin Tested Slices

Build the runtime one observable behavior at a time with tests in the same change.

Keep each task narrowly scoped, use deterministic semantics, reject unsupported behavior explicitly, and preserve full coverage while the repo is still small.

### Small Units

Ideas, principles, facts, and tasks should each be as discrete and fine-grained as possible.

Small, focused documents enable precise relationships between them. A task can link to exactly the principles it serves. A fact can describe one specific aspect of the system. This granularity reduces ambiguity.

Tasks especially benefit from being small. A narrowly scoped task gives agents or humans the best chance of delivering exactly what was intended, in a single atomic commit.

Note: This principle directly supports Lightweight Planning, which explicitly mentions that "Tasks are small and completable in single commits."

### Functional Core, Imperative Shell

Separate code into a pure "functional core" and a thin "imperative shell." The core takes values in and returns values out, with no side effects. The shell handles I/O and wires things together.

Purely functional code makes some things easier to understand: because values don't change, you can call functions and know that only their return value matters—they don't change anything outside themselves.

The functional core contains business logic as pure functions that take values and return values. The imperative shell sits at the boundary, reading input, calling into the core, and performing side effects with the results. This keeps the majority of code easy to test (no mocks or stubs needed for pure functions) and makes the I/O surface area small and explicit.

## Definition of Done

- `examples/todo-app/server.ts` contains all route constants, request handlers, and server startup logic previously split across `todo-http.ts` and `server.ts`.
- `examples/todo-app/todo-http.ts` is deleted.
- `examples/todo-app/todo-http.test.ts` is deleted; any test coverage it provided is preserved in `server.test.ts`.
- All existing tests pass.

## Task Type

implement

## Blocked By

(none)

## Decomposed From

Simplify Todo Example for Ergonomics
