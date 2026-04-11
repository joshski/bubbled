# Split Bubble Test Harness Rendering, Queries, and Assertions

`bubble-test/index.ts` is currently 587 lines. It combines three different responsibilities: rendering test trees into a bubble runtime, querying the semantic snapshot, and providing assertion helpers. The current API is convenient, but the implementation boundary is too broad for one file.

## Why This Matters

This package exists to speed up feedback loops. A monolithic test harness implementation works against that goal because it makes maintenance of test utilities more expensive than it needs to be, especially when render reconciliation and semantic diagnostics are changed independently.

## Current Context

- `createRenderHarness()` owns render-content normalization, rendered-tree bookkeeping, runtime reconciliation, click dispatch, tab navigation, and cleanup.
- `createSemanticContext()` defines the shared node lookup and diagnostic formatting used by both queries and assertions.
- `createSemanticQueries()` builds higher-level role/text queries on top of snapshot data.
- `createSemanticAssertions()` builds expectation helpers on top of the same semantic context.
- `createHarness()` composes all three surfaces into one convenience API.

## Friction Observed

- Render reconciliation is the densest logic in the file, but it shares space with mostly read-only semantic query helpers.
- Query and assertion behavior already share a small internal context, which suggests a natural module seam that is not yet reflected in the file structure.
- A change to failure messaging requires opening the same file that owns runtime mutation logic.
- The convenience API is small, but it sits on top of a large amount of unrelated implementation detail.

## Idea

Decompose `bubble-test` into focused modules while preserving the convenient combined harness API.

Possible shape:

- Move render tree creation and reconciliation into a render harness module.
- Move semantic context and diagnostic formatting into a shared support module.
- Move queries and assertions into separate modules that depend on the shared semantic context.
- Keep `createHarness()` as a small composition helper that combines the render harness with semantic helpers.

## Expected Outcome

- Rendering behavior and semantic diagnostics can evolve independently.
- Query/assertion helpers become easier to extend without carrying render-reconciliation context.
- The public harness API remains simple while the internal implementation becomes easier to navigate.
- Test utility changes require less context loading for agents and contributors.
