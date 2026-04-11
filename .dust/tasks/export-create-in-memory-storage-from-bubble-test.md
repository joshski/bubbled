# Export create-in-memory-storage from bubble-test

Move `createInMemoryStorage()` from `todo-store.test.ts` into `bubble-test/index.ts` and export it. Any app unit-testing code that depends on `BubbleStorage` can then import it without writing their own stub.

## Context

`todo-store.test.ts` defines:

```ts
function createInMemoryStorage(seed: Record<string, string> = {}): BubbleStorage {
  const entries = new Map<string, string>(Object.entries(seed))
  return {
    getItem(key) { return entries.get(key) ?? null },
    setItem(key, value) { entries.set(key, value) },
    removeItem(key) { entries.delete(key) },
    clear() { entries.clear() },
  }
}
```

This is generic with no todo-specific logic. It will be needed by any app that unit-tests store logic without a full `BubbleRuntime`. `bubble-test` is the natural home.

## Decisions

- **Name:** `createInMemoryStorage` — matches existing `create*` naming convention
- **Location:** Inline in `bubble-test/index.ts` — no new files (stub is short and unlikely to grow)
- **The `todo-store.test.ts` local copy:** replace with the imported version from `bubble-test`

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Guidance

### Build Thin Tested Slices

Build the runtime one observable behavior at a time with tests in the same change. Keep each task narrowly scoped, use deterministic semantics, reject unsupported behavior explicitly, and preserve full coverage while the repo is still small.

### Stubs Over Mocks

Prefer hand-rolled stubs over mocks, in unit tests. Stubs keep tests focused on observable behavior instead of implementation details.

Mocks tend to encode a script of "expected calls". That makes tests brittle: harmless refactors can break tests even when the externally visible behavior is unchanged. Stubs (and especially in-memory emulators) push tests toward the contract: provide inputs, run the code, assert outputs and side effects.

For external dependencies (databases, queues, object stores, HTTP services), the default choice should be an in-memory emulator: a drop-in replacement faithful to the real interface but running entirely in-process. It gives most of the benefits of integration testing without the cost, flakiness, and setup burden of booting real infrastructure.

### Dependency Injection

Avoid global mocks. Dependency injection is almost always preferable to testing code that depends directly on globals. Make dependencies explicit: pass them in as arguments. This improves testability, readability, and flexibility.

### Keep Unit Tests Pure

Unit tests should be pure and side-effect free. They must not access a database, communicate over a network, touch the file system, or require special environment setup. An in-memory `BubbleStorage` stub keeps store unit tests fast, deterministic, and infrastructure-free.

### Consistent Naming

Names should follow established conventions within each category to reduce cognitive load. `createInMemoryStorage` is consistent with `createBubble`, `createRenderHarness`, etc.

### Reasonably DRY

Extract shared code when the duplication is truly about the same concept and has proven stable. `createInMemoryStorage` is a generic `BubbleStorage` stub that any store unit test will need — extracting it is the right call.

## Task Type

implement

## Blocked By

(none)

## Definition of Done

- `createInMemoryStorage(seed?)` is exported from `bubble-test/index.ts`, inlined (not in a separate file)
- `createInMemoryStorage` is typed to return `BubbleStorage`
- The local copy in `examples/todo-app/app/todo-store.test.ts` is removed and replaced with the import from `bubble-test`
- All existing tests continue to pass
