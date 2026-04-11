# Extract Bubble Test Render Harness Module

Move `bubble-test` render reconciliation into focused internal module(s). Preserve the current render harness API and end-to-end behavior.

## Why This Matters

`createRenderHarness()` owns the densest mutable logic in `bubble-test/index.ts`: tree normalization, node creation and reconciliation, cleanup, click dispatch, and tab navigation. Extracting that vertical slice first reduces the size and coupling of the entrypoint without changing how tests render into `bubble-core` or drive interactions through the harness.

## Current Context

- `bubble-test/index.ts` currently mixes render reconciliation with semantic query and assertion helpers.
- Existing tests already cover root rendering, in-place compatible rerenders, incompatible replacement, cleanup, click dispatch, tab order traversal, and namespace preservation through the public harness API.
- `createHarness()` is already a thin composition helper on top of render, query, and assertion surfaces.

## Facts

- [Bubble core builds runtime behaviors as deterministic slices](../facts/bubble-core-builds-runtime-behaviors-as-deterministic-slices.md)

## Scope

- Extract render tree normalization, rendered-node bookkeeping, node creation, and reconciliation into internal module(s) under `bubble-test/`.
- Keep click dispatch, tab traversal, and cleanup inside the render-harness slice so render-plus-interaction behavior stays testable through one public API.
- Leave `createRenderHarness()` as the public entrypoint for this slice and keep `createHarness()` as composition only.
- Preserve current namespace handling, in-place updates for compatible nodes, replacement behavior for incompatible nodes, and interaction helper error messages.

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

- `bubble-test/index.ts` delegates render content normalization, rendered-node reconciliation, click dispatch, tab traversal, and cleanup to focused internal module(s) instead of owning that implementation directly.
- Existing render-harness behavior stays green end to end, including compatible in-place rerenders, incompatible replacement, namespace preservation, click dispatch, tab navigation, and cleanup.
- The public `createRenderHarness()` and `createHarness()` APIs remain unchanged.

## Task Type

implement

## Blocked By

(none)

## Decomposed From

Split Bubble Test Harness Rendering, Queries, and Assertions
