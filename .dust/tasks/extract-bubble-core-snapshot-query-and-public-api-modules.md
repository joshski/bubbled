# Extract Bubble Core Snapshot, Query, and Public API Modules

Move `bubble-core`'s readonly snapshot helpers and public runtime types into focused internal module(s). Preserve `index.ts` as the single supported import surface.

## Why This Matters

`createBubbleQuery()` and `serializeBubbleSnapshot()` operate on readonly snapshots rather than on the mutable runtime, but they currently live beside runtime mechanics, eventing, and DOM-semantics helpers in the same file. Separating the readonly API surface after the runtime and semantics seams are explicit will make API-only work cheaper and leave `index.ts` as a small composition and export layer.

## Current Context

- `bubble-core/index.ts` currently mixes exported public types, readonly snapshot helpers, mutable runtime behavior, and internal helper implementations in one file.
- Existing tests already cover snapshot immutability, stable serialization ordering, deterministic serialized output, query lookup by role and accessible name, and label-to-control lookup through the public snapshot API.
- Query helpers rely on the semantics-layer behavior that derives `role`, `name`, and label associations.
- The package should keep a single public `index.ts` entrypoint even after internal extraction.

## Facts

- [Bubble core builds runtime behaviors as deterministic slices](../facts/bubble-core-builds-runtime-behaviors-as-deterministic-slices.md)
- [Runtime exposes stable snapshot serialization](../facts/runtime-exposes-stable-snapshot-serialization.md)

## Scope

- Extract internal readonly module(s) for `createBubbleQuery()`, `serializeBubbleSnapshot()`, and any snapshot-only traversal helpers they require.
- Extract public runtime and snapshot type declarations into focused internal API module(s) that `index.ts` re-exports.
- Keep `index.ts` as the only public package entrypoint and ensure it remains the small composition and export surface for the package.
- Leave runtime-store, capability, event, focus, and DOM-semantics implementations to their respective modules and import them through internal boundaries.

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

- `bubble-core/index.ts` re-exports public types and delegates readonly snapshot helpers to focused internal module(s) instead of defining them inline.
- Public snapshot APIs remain unchanged, including deterministic serialization output, query lookup by role and accessible name, and label-to-control lookup.
- Existing end-to-end tests stay green for snapshot immutability, stable serialization, and readonly query behavior.

## Task Type

implement

## Blocked By

- [Extract Bubble Core Event Dispatch, Focus, and Tab Navigation Modules](./extract-bubble-core-event-dispatch-focus-and-tab-navigation-modules.md)
- [Extract Bubble Core DOM Semantics and Form Modules](./extract-bubble-core-dom-semantics-and-form-modules.md)

## Decomposed From

Split Bubble Core Runtime into Focused Modules
