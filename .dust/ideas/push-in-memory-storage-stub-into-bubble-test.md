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

## Open Questions

### Should the exported name be `createInMemoryStorage` or something that signals it is for testing?

#### Option

Keep `createInMemoryStorage` — consistent with `createBubble`, `createHarness`, etc. Moving it verbatim keeps the name simple.

#### Option

Name it `createFakeStorage` or `createStorageStub` — explicitly signals test-only usage, matching the "stub" vocabulary in project principles (`stubs-over-mocks`).

### Where in bubble-test should it live?

#### Option

Add it directly to `bubble-test/index.ts` — simple, no new files.

#### Option

Add a dedicated `bubble-test/storage-stub.ts` file and export from the index — `bubble-test` currently exports render and semantic utilities; a separate file keeps storage stubs as their own concern, consistent with the existing pattern of one-concern-per-file.
