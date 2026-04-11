# Extract Bubble Test Semantic Query Modules

Move `bubble-test` semantic context and query helpers into focused internal module(s) while preserving the current query API and diagnostic behavior.

## Why This Matters

The query path in `bubble-test/index.ts` is mostly read-only logic over the runtime snapshot, but it currently sits beside render reconciliation and assertion helpers. Extracting the shared semantic context plus query helpers creates a cleaner seam for extending role and text lookups without carrying render-mutation logic in the same file.

## Current Context

- `createSemanticContext()` already centralizes node lookup, text aggregation, and node descriptions used by both queries and assertions.
- `createSemanticQueries()` builds `getByRole()` and `getByText()` on top of that shared semantic context and snapshot data.
- Existing tests already cover role queries, name filtering, regex matching, unnamed-node diagnostics, and text-query miss reporting through the public query API.

## Facts

- [Runtime exposes stable snapshot serialization](../facts/runtime-exposes-stable-snapshot-serialization.md)
- [Bubble core builds runtime behaviors as deterministic slices](../facts/bubble-core-builds-runtime-behaviors-as-deterministic-slices.md)

## Scope

- Extract the shared semantic context and query helpers into internal module(s) under `bubble-test/`.
- Keep query behavior driven through `createSemanticQueries()` and through the composed `createHarness()` surface rather than introducing a new public API.
- Preserve current role matching, accessible-name filtering, text matching, root-text traversal, and failure-message behavior.
- Leave semantic assertions in place for a follow-up extraction, but shape the shared context boundary so assertions can depend on it cleanly.

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)
- Small Units
- Make the Change Easy
- Decoupled Code

## Guidance

### Build Thin Tested Slices

Build the runtime one observable behavior at a time with tests in the same change.

Keep each task narrowly scoped, use deterministic semantics, reject unsupported behavior explicitly, and preserve full coverage while the repo is still small.

## Parent Principle

(none)

## Sub-Principles

(none)

### Small Units

Ideas, principles, facts, and tasks should each be as discrete and fine-grained as possible.

Small, focused documents enable precise relationships between them. A task can link to exactly the principles it serves. A fact can describe one specific aspect of the system. This granularity reduces ambiguity.

Tasks especially benefit from being small. A narrowly scoped task gives agents or humans the best chance of delivering exactly what was intended, in a single atomic commit.

Note: This principle directly supports Lightweight Planning, which explicitly mentions that "Tasks are small and completable in single commits."

## Parent Principle

- Agent Autonomy

## Sub-Principles

- (none)

### Make the Change Easy

For each desired change, make the change easy, then make the easy change.

This principle, articulated by Kent Beck, recognizes that the hardest part of a change is often not the change itself but the state of the code receiving it. When code resists a change, the right response is to first refactor until the change becomes straightforward, and only then make it. The warning - "this may be hard" - acknowledges that preparing the ground takes real effort, but the result is a change that fits naturally rather than one forced in against the grain.

Work that supports this principle includes refactoring before feature work, improving abstractions that make a category of changes simpler, and resisting the urge to bolt changes onto code that isn't ready for them.

## Parent Principle

- Maintainable Codebase

## Sub-Principles

- (none)

### Decoupled Code

Code should be organized into independent units with explicit dependencies.

Decoupled code is easier to test, understand, and modify. Dependencies are passed in rather than hard-coded, enabling units to be tested in isolation and composed flexibly. This reduces the blast radius of changes and makes the system more maintainable.

## Parent Principle

- Make Changes with Confidence

## Sub-Principles

- Dependency Injection
- Stubs Over Mocks
- Functional Core, Imperative Shell
- Design for Testability

## Definition of Done

- `bubble-test/index.ts` delegates semantic node lookup, text traversal, node description formatting, and query helpers to focused internal module(s).
- Existing query coverage stays green end to end, including role-only lookup, accessible-name filtering, regex matching, `getByText()`, and current failure diagnostics.
- `createSemanticQueries()` and the query surface exposed by `createHarness()` remain unchanged.

## Task Type

implement

## Blocked By

(none)

## Decomposed From

Split Bubble Test Harness Rendering, Queries, and Assertions
