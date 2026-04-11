# Push In-Memory Storage Stub into bubble-test

`todo-store.test.ts` defines a `createInMemoryStorage()` helper that returns a `BubbleStorage` implementation backed by a `Map`. Any app that unit-tests code depending on `BubbleStorage` directly (without a full `BubbleRuntime`) will need to write the same stub. Moving it into `bubble-test` would remove that duplication.

## Context

`BubbleStorage` is a capability interface defined in `bubble-capabilities`. The bubble runtime provides an in-memory implementation via `bubble.resolveCapability('storage')`, but unit tests for store logic (like `createTodoStore`) often don't want a full runtime — they just need a lightweight storage stub.

The current implementation in `examples/todo-app/app/todo-store.test.ts`:

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

This is a complete, generic implementation with no todo-specific logic. A `seed` parameter makes it convenient to pre-populate storage for hydration tests.

`bubble-test` currently exports render helpers (`createRenderHarness`), semantic query helpers (`createSemanticQueries`), and semantic assertion helpers (`createSemanticAssertions`). Each concern lives in its own file (`render-harness.ts`, `semantic-queries.ts`, `semantic-assertions.ts`) and is exported from `index.ts`.

## Open Questions

### Should the exported name signal generic capability or test-only intent?

#### `createInMemoryStorage` — matches existing naming conventions

Consistent with `createBubble`, `createHarness`, `createRenderHarness`. Moving it verbatim keeps the name simple and unsurprising.

#### `createStorageStub` — signals test-only intent

Explicitly marks the helper as test infrastructure, matching the `stubs-over-mocks` principle vocabulary. Callers scanning `bubble-test` exports see immediately that this is a stub, not a production implementation.

### Where in `bubble-test` should the stub live?

#### Inline in `bubble-test/index.ts` — no new files

Simple, low overhead. Appropriate if the stub is short and unlikely to grow.

#### Dedicated `bubble-test/storage-stub.ts` exported from the index — one concern per file

Follows the existing pattern where each exported concern (`render-harness.ts`, `semantic-queries.ts`, `semantic-assertions.ts`) has its own file. Keeps `index.ts` as a pure re-export barrel and makes the stub easy to locate.
