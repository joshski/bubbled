---
name: Simplify browser startup code
description: Remove injection complexity from todo-browser.ts and delete its tests
type: implement
---

# Simplify browser startup code

`startTodoApp` in `todo-browser.ts` accepts five injected dependencies to stay unit-testable without a DOM. This results in unnecessary complexity: three duck-typed DOM interfaces, extracted helper functions that exist only to be injectable, and 289 lines of fake DOM scaffolding in its test file.

All meaningful behavior is tested elsewhere. The startup function is thin wiring — the injection harness adds complexity without value.

## Changes Required

- Remove the five injectable parameters from `startTodoApp`; have it read `globalThis.document`, `globalThis.fetch`, and `globalThis.addEventListener` directly
- Remove the three duck-typed DOM interfaces (`TodoAppTextNodeLike`, `TodoAppMountContainerLike`, `TodoAppDocumentLike`)
- Remove the `StartTodoAppOptions` interface
- Remove `isDefaultMountContainer` — inline `instanceof HTMLElement` directly
- Remove `renderStartupError` — inline its three-line body
- Inline `loadInitialTodos` into `startTodoApp` (it's a two-liner called in one place)
- Delete `todo-browser.test.ts`

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Reasonably DRY](../principles/reasonably-dry.md)
- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Guidance

### Functional Core, Imperative Shell

Separate code into a pure "functional core" and a thin "imperative shell." The core takes values in and returns values out, with no side effects. The shell handles I/O and wires things together.

Purely functional code makes some things easier to understand: because values don't change, you can call functions and know that only their return value matters—they don't change anything outside themselves.

The functional core contains business logic as pure functions that take values and return values. The imperative shell sits at the boundary, reading input, calling into the core, and performing side effects with the results. This keeps the majority of code easy to test (no mocks or stubs needed for pure functions) and makes the I/O surface area small and explicit.

### Reasonably DRY

Don't repeat yourself is a good principle, but don't overdo it.

Extracting shared code too eagerly can create tight coupling, obscure intent, and make changes harder. When two pieces of code look similar but serve different purposes or are likely to evolve independently, duplication is the better choice. The cost of a wrong abstraction is higher than the cost of a little repetition. Extract shared code when the duplication is truly about the same concept and has proven stable, not just because two things happen to look alike right now.

### Build Thin Tested Slices

Build the runtime one observable behavior at a time with tests in the same change.

Keep each task narrowly scoped, use deterministic semantics, reject unsupported behavior explicitly, and preserve full coverage while the repo is still small.

## Task Type

implement

## Blocked By

(none)

## Definition of Done

- `startTodoApp` in `todo-browser.ts` takes no parameters and reads from `globalThis` directly
- All three duck-typed DOM interfaces are removed
- `StartTodoAppOptions` interface is removed
- `isDefaultMountContainer` is removed (logic inlined)
- `renderStartupError` is removed (logic inlined)
- `loadInitialTodos` is removed (logic inlined)
- `todo-browser.test.ts` is deleted
- `bunx dust check` passes
