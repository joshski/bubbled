# Split Bubble Test Semantic Helpers From Render Harness

`bubble-test` currently exposes rendering, semantic queries, event helpers, and assertion helpers through one `createHarness()` implementation. The runtime foundations review found the rendering slice itself useful and deterministic, but the combined helper surface makes the package broader than it needs to be.

## Task Type

refine

## Blocked By

(none)

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)
- Small Units (core principle)
- Task-First Workflow (core principle)

## Facts

- [Bubble core builds runtime behaviors as deterministic slices](../facts/bubble-core-builds-runtime-behaviors-as-deterministic-slices.md)

## Definition of Done

- `bubble-test` moves semantic query and assertion helpers out of the rendering-focused `createHarness()` implementation into one or more smaller helpers with explicit responsibilities
- Colocated tests continue to cover the rendering helper and the extracted semantic helpers together without reducing current diagnostics or determinism
- The resulting public API makes it clearer which helpers are responsible for rendering, querying, and assertions
