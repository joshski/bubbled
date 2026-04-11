# Extract Bubble Browser Projection State and Layout Modules

Split `bubble-browser`'s DOM-backed projection state into focused internal modules. Preserve `createDomProjector()` and `createDomLayout()` as the public entrypoints.

## Why This Matters

The browser package currently hides DOM lookup state inside `createDomProjector()` while `createDomLayout()` depends on that state indirectly through a `WeakMap`. Extracting a reusable projection-state abstraction makes the existing coupling explicit, gives layout behavior a stable dependency boundary, and creates a cleaner base for later projector refactors.

## Current Context

- `bubble-browser/index.ts` currently owns popover placement helpers, DOM-backed layout measurement, projected node lookup maps, DOM mutation application, lifecycle wiring, focus synchronization, and native event bridging.
- `createDomLayout({ projector })` measures projected nodes by reaching through projector-owned lookup state stored in a module-level `WeakMap`.
- Existing tests already cover `placePopover()`, `measureAndPlacePopover()`, successful DOM-backed measurement, and failures for unsupported, unknown, and detached nodes.
- The public package surface should stay at `bubble-browser/index.ts`, with extracted modules remaining internal implementation details.

## Facts

- [Bubble browser mounts snapshots into DOM containers](../facts/bubble-browser-mounts-snapshots-into-dom-containers.md)
- [Bubble browser can measure projected DOM layout](../facts/bubble-browser-can-measure-projected-dom-layout.md)

## Scope

- Introduce an internal projection-state abstraction that owns projected node lookup, projected element lookup, and any helper APIs needed by both projection and layout code.
- Move `placePopover()` and `measureAndPlacePopover()` into a focused internal layout module and keep them re-exported from the public entrypoint.
- Move DOM-backed layout measurement behind an internal layout adapter that depends on the new projection-state abstraction instead of a projector-keyed `WeakMap`.
- Keep `createDomProjector()` as the public composition point and preserve current mount, unmount, projection, and layout behavior.
- Leave native event bridge extraction and focus synchronization extraction to later tasks.

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

- `bubble-browser/index.ts` delegates projection-state ownership and layout helpers to focused internal module(s).
- `createDomLayout()` continues to measure projected elements end-to-end through the new projection-state abstraction and preserves current error messages for unsupported, unknown, and detached nodes.
- Existing tests stay green for popover placement and DOM-backed layout measurement.

## Task Type

implement

## Blocked By

(none)

## Decomposed From

Split Bubble Browser Projector, Layout, and Event Bridges
