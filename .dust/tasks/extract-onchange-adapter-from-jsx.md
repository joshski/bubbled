# Extract onChange Adapter from JSX

Extract the `onChange` event adapter from `todo-app.tsx` into a pure function in `todo-react.ts` or `todo-store.ts`, and add a unit test for it.

## Background

`todo-app.tsx` is purely presentational — all state and business logic lives in `todo-store.ts` and `todo-react.ts`. However, it contains one piece of non-trivial logic embedded in the JSX `onChange` handler:

```ts
String(bubbleEvent.data['value'] ?? '')
```

This adapter casts a Bubble event to extract a string value. Extracting it to a named pure function makes it unit-testable in isolation and removes all logic from the JSX file.

## Task Type

implementation

## Blocked By

(none)

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Guidance

### Functional Core, Imperative Shell

Separate code into a pure "functional core" and a thin "imperative shell." The core takes values in and returns values out, with no side effects. The shell handles I/O and wires things together.

Purely functional code makes some things easier to understand: because values don't change, you can call functions and know that only their return value matters—they don't change anything outside themselves.

The functional core contains business logic as pure functions that take values and return values. The imperative shell sits at the boundary, reading input, calling into the core, and performing side effects with the results. This keeps the majority of code easy to test (no mocks or stubs needed for pure functions) and makes the I/O surface area small and explicit.

### Design for Testability

Design code to be testable first; good structure follows naturally.

Testability should be a primary design driver, not a quality to be retrofitted. When code is designed to be testable from the start, it naturally becomes decoupled, explicit in its dependencies, and clear in its interfaces.

This is particularly important in agent-driven development. Agents cannot manually verify their changes—they rely entirely on tests. Code that resists testing resists autonomous modification.

### Build Thin Tested Slices

Build the runtime one observable behavior at a time with tests in the same change.

Keep each task narrowly scoped, use deterministic semantics, reject unsupported behavior explicitly, and preserve full coverage while the repo is still small.

## Definition of Done

- The `onChange` adapter logic is extracted from `todo-app.tsx` into a named pure function in `todo-react.ts` or `todo-store.ts`
- A unit test for the extracted function is added to the corresponding test file
- `todo-app.tsx` calls the extracted function and contains no logic of its own
- All tests pass
