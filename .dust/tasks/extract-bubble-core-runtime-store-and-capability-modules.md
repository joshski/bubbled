# Extract Bubble Core Runtime Store and Capability Modules

Move `bubble-core`'s mutable runtime store and capability wiring into focused internal module(s). Keep `index.ts` as the only public entrypoint.

## Why This Matters

`createBubble()` currently owns the lowest-level runtime mechanics: capability setup, mutable node storage, transaction staging, snapshot cloning, runtime event publication, and the public imperative shell. Extracting that foundation first reduces the size of the entrypoint and gives later eventing and DOM-semantics work a clearer runtime boundary to build on.

## Current Context

- `bubble-core/index.ts` is the only file in the package today and is about 1,760 lines long.
- Existing tests already cover injected clock behavior, deterministic timers, deterministic microtasks, deterministic storage, viewport access and subscriptions, scripted network requests, runtime subscriber publication, and transactional snapshot updates through the public `createBubble()` API.
- The idea's resolved direction is to keep a single public `index.ts` entrypoint while moving implementation into internal files only.
- The idea's resolved sequencing is to start with runtime mechanics before DOM-semantics-oriented extraction.

## Facts

- [Bubble core builds runtime behaviors as deterministic slices](../facts/bubble-core-builds-runtime-behaviors-as-deterministic-slices.md)
- [Runtime uses injected clock](../facts/runtime-uses-injected-clock.md)
- [Runtime exposes deterministic timers](../facts/runtime-exposes-deterministic-timers.md)
- [Runtime exposes deterministic microtasks](../facts/runtime-exposes-deterministic-microtasks.md)
- [Runtime exposes deterministic storage](../facts/runtime-exposes-deterministic-storage.md)
- [Runtime exposes deterministic viewport](../facts/runtime-exposes-deterministic-viewport.md)
- [Runtime exposes scripted network](../facts/runtime-exposes-scripted-network.md)

## Scope

- Extract internal runtime-store module(s) that own mutable node maps, snapshot cloning inputs, transaction application, and commit-record creation.
- Extract internal capability module(s) that own default deterministic capability construction plus capability-registry wiring for clock, timers, scheduler, storage, viewport, and network.
- Keep `createBubble()` as the public composition point that wires these internal modules together and exposes the existing API surface.
- Leave event dispatch, focus management, tab order, accessible metadata derivation, label resolution, query helpers, and form serialization in place for later tasks.

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

- `bubble-core/index.ts` becomes a smaller composition layer for runtime-store and capability setup instead of directly owning those implementations.
- The public `createBubble()` API remains unchanged, including root creation, transaction entry, snapshots, runtime subscriptions, and capability resolution.
- End-to-end coverage stays green for injected clock behavior, timers, microtasks, storage, viewport access and subscriptions, network dispatch, and transaction-driven snapshot updates.

## Task Type

implement

## Blocked By

(none)

## Decomposed From

Split Bubble Core Runtime into Focused Modules
