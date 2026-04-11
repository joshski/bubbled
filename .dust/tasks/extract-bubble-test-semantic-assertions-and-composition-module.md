# Extract Bubble Test Semantic Assertions and Composition Module

Move `bubble-test` assertion helpers into focused internal module(s). Reduce `createHarness()` to a small final composition layer over render and semantic helpers.

## Why This Matters

Assertion helpers are the last large read-oriented slice still coupled to render reconciliation in `bubble-test/index.ts`. Extracting them after the shared semantic context exists leaves the entrypoint as a small composition module and makes failure-message work independent from runtime mutation logic.

## Current Context

- `createSemanticAssertions()` already depends on the shared semantic context that also powers queries.
- Existing tests cover successful assertion helpers plus clear failure output for role, name, text, focus, value, checked-state, missing-node, and non-element-node cases.
- `createHarness()` is already a small convenience layer that should stay that way after the extraction.

## Facts

- [Runtime exposes stable snapshot serialization](../facts/runtime-exposes-stable-snapshot-serialization.md)
- [Bubble core builds runtime behaviors as deterministic slices](../facts/bubble-core-builds-runtime-behaviors-as-deterministic-slices.md)

## Scope

- Extract semantic assertion helpers into internal module(s) under `bubble-test/` that depend on the shared semantic context boundary.
- Keep `createHarness()` as a small composition helper that combines the existing render harness with semantic queries and semantic assertions.
- Preserve current assertion coverage and failure-message detail for text, role, accessible name, focus, value, checked state, missing nodes, and non-element targets.
- Finish the decomposition by leaving `bubble-test/index.ts` as a narrow public entrypoint over the extracted modules.

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

- `bubble-test/index.ts` delegates semantic assertions to focused internal module(s) and remains a narrow public composition entrypoint.
- Existing assertion coverage stays green end to end, including success cases plus current diagnostic output for role, name, text, focus, value, checked-state, missing-node, and non-element failures.
- `createSemanticAssertions()` and the combined `createHarness()` API remain unchanged.

## Task Type

implement

## Blocked By

(none)

## Decomposed From

Split Bubble Test Harness Rendering, Queries, and Assertions
