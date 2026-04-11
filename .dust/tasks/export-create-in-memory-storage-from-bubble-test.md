# Export createInMemoryStorage from bubble-test

Move the `createInMemoryStorage()` helper from `examples/todo-app/app/todo-store.test.ts` into `bubble-test/index.ts` and export it so any app unit-testing code that depends on `BubbleStorage` can use it without writing their own stub.

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

This is generic, has no todo-specific logic, and will be needed by any app that unit-tests store logic without a full `BubbleRuntime`. `bubble-test` is the natural home.

## Decisions

- **Name:** `createInMemoryStorage` — matches existing `create*` naming convention
- **Location:** Inline in `bubble-test/index.ts` — no new files (stub is short and unlikely to grow)
- **The `todo-store.test.ts` local copy:** replace with the imported version from `bubble-test`

## Principles

- [Stubs Over Mocks](../principles/stubs-over-mocks.md)
- [Dependency Injection](../principles/dependency-injection.md)
- [Design for Testability](../principles/design-for-testability.md)
- [Keep Unit Tests Pure](../principles/keep-unit-tests-pure.md)
- [Consistent Naming](../principles/consistent-naming.md)
- [Reasonably DRY](../principles/reasonably-dry.md)
- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Guidance

### Stubs Over Mocks

Prefer hand-rolled stubs over mocks, in unit tests. Stubs keep tests focused on observable behavior instead of implementation details.

Mocks tend to encode a script of "expected calls" (what was invoked, in what order, with what arguments). That makes tests brittle: harmless refactors (changing internal decomposition, adding caching, batching calls, reordering operations) can break tests even when the externally visible behavior is unchanged. You end up maintaining tests that police how the code works rather than what it does.

Stubs (and especially in-memory emulators) push tests toward the contract: provide inputs, run the code, assert outputs and side effects. When a test fails, it's usually because a behavior changed, not because the internal call choreography shifted. That improves signal-to-noise, reduces rewrites during refactors, and makes it easier to evolve the implementation.

For external dependencies (databases, queues, object stores, HTTP services), the default choice should be an in-memory emulator: a drop-in replacement that is faithful enough to the real interface/semantics but runs entirely in-process. It gives most of the benefits of integration testing—realistic state transitions, error modes, concurrency behavior where relevant—without the cost, flakiness, and setup burden of booting real infrastructure. It also keeps the test environment hermetic (no network, no shared state), which improves determinism and makes tests fast.

Still use mocks selectively—mainly to assert something is called (e.g., telemetry emission, "at most once" notifications, payment capture guarded by a feature flag) or when a dependency is impossible to emulate. But for most cases, stubs and in-memory emulators produce tests that are clearer, more resilient to refactoring, and better aligned with the system's actual contracts.

### Dependency Injection

Avoid global mocks. Dependency injection is almost always preferable to testing code that depends directly on globals.

When code depends on global state or singletons, testing requires mocking those globals—which introduces hidden coupling, complicates test setup, and risks interference between tests. Dependency injection makes dependencies explicit: they're passed in as arguments, making the code's requirements visible and enabling tests to supply controlled implementations.

This approach improves testability (each test controls its own dependencies), readability (dependencies are declared upfront), and flexibility (swapping implementations doesn't require changing the consuming code). It also makes refactoring safer since dependencies are explicit rather than implicit.

### Design for Testability

Design code to be testable first; good structure follows naturally.

Testability should be a primary design driver, not a retrofitted quality. When code is designed to be testable from the start, it naturally becomes decoupled, explicit in its dependencies, and clear in its interfaces.

The discipline of testability forces good design: functions become pure, dependencies become explicit, side effects become isolated. Rather than viewing testability as a tax on production code, recognize it as a compass that points toward better architecture.

This is particularly important in agent-driven development. Agents cannot manually verify their changes—they rely entirely on tests. Code that resists testing resists autonomous modification.

### Keep Unit Tests Pure

Unit tests (those run very frequently as part of a tight feedback loop) should be pure and side-effect free. A test is **not** a unit test if it accesses a database, communicates over a network, touches the file system, cannot run concurrently with other tests, or requires special environment setup.

The value of pure unit tests is that they are fast, deterministic, and isolate business logic from infrastructure concerns.

### Consistent Naming

Names should follow established conventions within each category to reduce cognitive load. When naming conventions exist, follow them. When they don't, establish one and apply it consistently. `createInMemoryStorage` is consistent with `createBubble`, `createRenderHarness`, etc.

### Reasonably DRY

Don't repeat yourself is a good principle, but don't overdo it. Extract shared code when the duplication is truly about the same concept and has proven stable — which is the case here: `createInMemoryStorage` is a generic `BubbleStorage` stub that any store unit test will need.

### Build Thin Tested Slices

Build the runtime one observable behavior at a time with tests in the same change. Keep each task narrowly scoped, use deterministic semantics, reject unsupported behavior explicitly, and preserve full coverage while the repo is still small.

## Definition of Done

- `createInMemoryStorage(seed?)` is exported from `bubble-test/index.ts`, inlined (not in a separate file)
- `createInMemoryStorage` is typed to return `BubbleStorage`
- The local copy in `examples/todo-app/app/todo-store.test.ts` is removed and replaced with the import from `bubble-test`
- All existing tests continue to pass
