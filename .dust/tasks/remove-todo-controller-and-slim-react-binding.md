# Remove Todo Controller and Slim React Binding

Eliminate `todo-controller.ts` by folding its snapshot logic into the pure todo module. Wire the React binding directly to the store, leaving a three-layer shape: pure todo module, storage-backed store, and thin React binding.

## Why This Matters

`todo-controller.ts` adds a conceptual layer without adding independent business logic. It derives a view snapshot from store state and forwards store commands, but neither of those is a strong enough boundary to justify a separate file in an example meant to show minimum practical ceremony. Removing it makes the full app readable across fewer files and keeps the example honest about how thin the React layer needs to be.

## Current Context

- `examples/todo-app/todo-controller.ts` creates a snapshot (`createTodoAppSnapshot()`) from store state and wraps store commands under view-model labels.
- `examples/todo-app/todo-react.ts` creates the store, creates a controller, owns the render loop, and contains the only component with local state.
- `examples/todo-app/todo-app.tsx` is the presentational JSX component.
- `examples/todo-app/todo-store.ts` keeps the storage-backed state and is already a well-defined seam.
- `examples/todo-app/todo-controller.test.ts` tests the forwarding/snapshot layer independently.
- `examples/todo-app/todo-app.test.tsx` already exercises most user-visible behavior end-to-end.
- `examples/todo-app/todo-browser.ts` is the browser shell; it creates the store explicitly (`createTodoStore({ storage: bubble.resolveCapability('storage') })`) and passes it to the React mount — keep this seam visible.

## Resolved Design Decisions

- Keep `/api/todos` for loading initial todos (no inlining into HTML).
- Keep `createTodoStore({ storage })` explicit in the browser shell (`todo-browser.ts`), not hidden inside a mount helper.

## Scope

- Move `createTodoSnapshot()` (or equivalent pure derivation of view state from todos) into the pure todo module (`todo-store.ts` or a shared pure module alongside it).
- Rewrite `todo-react.ts` (or rename to `todo-react.tsx`) so it calls the snapshot function directly from the store, renders the JSX, and owns local draft input state — without going through a controller.
- Delete `todo-controller.ts` and `todo-controller.test.ts`.
- Keep `todo-browser.ts` passing the store explicitly into the React mount function.
- Keep `todo-app.tsx` as the presentational component or inline it into the React binding if that improves readability — either is acceptable.
- Preserve all user-visible behavior verified by `todo-app.test.tsx`; update or extend tests as needed to cover any logic that moved.

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)
- Functional Core, Imperative Shell
- Design for Testability
- Progressive Disclosure

## Guidance

### Build Thin Tested Slices

Build the runtime one observable behavior at a time with tests in the same change.

Keep each task narrowly scoped, use deterministic semantics, reject unsupported behavior explicitly, and preserve full coverage while the repo is still small.

### Functional Core, Imperative Shell

Separate code into a pure "functional core" and a thin "imperative shell." The core takes values in and returns values out, with no side effects. The shell handles I/O and wires things together.

Purely functional code makes some things easier to understand: because values don't change, you can call functions and know that only their return value matters—they don't change anything outside themselves.

The functional core contains business logic as pure functions that take values and return values. The imperative shell sits at the boundary, reading input, calling into the core, and performing side effects with the results. This keeps the majority of code easy to test (no mocks or stubs needed for pure functions) and makes the I/O surface area small and explicit.

### Design for Testability

Design code to be testable first; good structure follows naturally.

Testability should be a primary design driver, not a quality to be retrofitted. When code is designed to be testable from the start, it naturally becomes decoupled, explicit in its dependencies, and clear in its interfaces.

The discipline of testability forces good design: functions become pure, dependencies become explicit, side effects become isolated. Rather than viewing testability as a tax on production code, recognize it as a compass that points toward better architecture.

This is particularly important in agent-driven development. Agents cannot manually verify their changes—they rely entirely on tests. Code that resists testing resists autonomous modification.

### Progressive Disclosure

Dust should reveal details progressively as a way of achieving context window efficiency.

Not all information is needed at once. A task list showing just titles is sufficient for choosing what to work on. Full task details are only needed when actively implementing. Linked principles and facts can be followed when deeper context is required.

This layered approach keeps initial reads lightweight while preserving access to complete information when needed.

## Definition of Done

- `todo-controller.ts` and `todo-controller.test.ts` are deleted.
- Snapshot derivation logic (view state from todos) lives in the pure todo module and is called directly from the React binding.
- `todo-react.ts` (or `todo-react.tsx`) creates no controller; it reads from the store, derives the snapshot, and renders the JSX.
- `todo-browser.ts` still creates the store explicitly with `createTodoStore({ storage: bubble.resolveCapability('storage') })` and passes it to the React mount.
- All user-visible behaviors from `todo-app.test.tsx` continue to pass.
- No test coverage is silently dropped; if a deleted test file covered meaningful behavior, that behavior is covered elsewhere.

## Task Type

implement

## Blocked By

(none)

## Decomposed From

Simplify Todo Example for Ergonomics
