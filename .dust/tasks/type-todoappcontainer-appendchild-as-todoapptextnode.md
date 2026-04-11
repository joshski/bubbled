# Type TodoAppContainer.appendChild as TodoAppTextNode

Tighten `TodoAppContainer.appendChild` to accept `TodoAppTextNode` instead of `unknown`, eliminating the unsafe cast in the test stub.

## Changes

- In `examples/todo-app/app/start-todo-app.ts`, change the `TodoAppContainer` interface:
  - `appendChild(node: unknown): unknown` → `appendChild(node: TodoAppTextNode): void`
- In `examples/todo-app/app/start-todo-app.test.ts`, update `createFakeContainer`:
  - Remove `node as TodoAppTextNode` cast (parameter is now typed correctly)
  - Change return type annotation and body to `void` (drop `return node`)
- In `examples/todo-app/app/todo-store.test.ts` line 105, replace `persisted as string` with `persisted!` (a null-checked non-null assertion), since `expect(persisted).not.toBeNull()` already guards the value on the line above

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Guidance

### Build Thin Tested Slices

Build the runtime one observable behavior at a time with tests in the same change.

Keep each task narrowly scoped, use deterministic semantics, reject unsupported behavior explicitly, and preserve full coverage while the repo is still small.

### Lint Everything (core principle)

Prefer static analysis over runtime checks. Every error caught by a linter is an error that never reaches tests, and every error caught by tests is an error that never reaches production.

Lint markdown, lint types, lint formatting. If it can be checked statically, check it. Linters are fast, deterministic, and catch entire categories of bugs before code even runs.

### Clarity Over Brevity (core principle)

Names should be descriptive and self-documenting, even if longer. This applies to types too — a parameter typed as `TodoAppTextNode` is immediately clear about what it accepts; `unknown` is not.

### Boy Scout Rule (core principle)

Always leave the code better than you found it. These type narrowing improvements are small, obvious, and low-risk — exactly the kind of incremental improvement this principle encourages.

## Blocked By

(none)

## Definition of Done

- `TodoAppContainer.appendChild` is typed as `(node: TodoAppTextNode): void`
- The `node as TodoAppTextNode` cast is gone from the test stub in `start-todo-app.test.ts`
- The `persisted as string` cast is gone from `todo-store.test.ts`
- `bunx dust check` passes
