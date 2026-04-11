# Extract Bubble Core DOM Semantics and Form Modules

Move `bubble-core`'s DOM-semantics helpers into focused internal module(s). Let them own accessible names, roles, labels, tabbability, and form serialization.

## Why This Matters

The browser-like semantics in `bubble-core` are currently implicit helpers inside the main runtime file. Pulling them into explicit internal modules gives future behavior changes a clear landing zone and reduces the risk of coupling accessibility and form rules to unrelated runtime mechanics.

## Current Context

- `bubble-core/index.ts` currently mixes runtime state management with helper logic for implicit roles, accessible names, label resolution, labelable descendants, input coercion, disabled-state checks, tabbability, and form payload extraction.
- Existing tests already cover role derivation, accessible-name derivation, explicit and nested label resolution, invalid label associations, deterministic form serialization, checkbox inclusion rules, disabled-control exclusion, and submit payload behavior.
- Query helpers depend on the derived role, accessible name, and label-resolution behavior owned by this semantics layer.
- The package should keep a single public `index.ts` entrypoint with internal implementation files only.

## Facts

- [Bubble core builds runtime behaviors as deterministic slices](../facts/bubble-core-builds-runtime-behaviors-as-deterministic-slices.md)
- [Runtime exposes stable snapshot serialization](../facts/runtime-exposes-stable-snapshot-serialization.md)

## Scope

- Extract internal DOM-semantics module(s) for implicit role derivation, accessible-name calculation, label resolution, form-control classification, disabled-state checks, and tabbability.
- Extract internal form module(s) that own deterministic form serialization and any helper logic required for submit payload generation.
- Preserve the current derived `role` and `name` metadata on snapshots so existing query and serialization behavior stays intact.
- Leave the mutable runtime store, capability setup, event dispatch orchestration, and public entrypoint composition to other tasks.

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

- `bubble-core/index.ts` delegates accessible-name and role derivation, label association, tabbability checks, and form serialization helpers to focused internal module(s).
- Snapshot metadata remains unchanged for existing end-to-end consumers, including derived `role` and `name` fields and label lookup behavior.
- Existing tests stay green for role derivation, accessible-name derivation, label resolution, tabbability, deterministic form serialization, and submit payload generation.

## Task Type

implement

## Blocked By

(none)

## Decomposed From

Split Bubble Core Runtime into Focused Modules
