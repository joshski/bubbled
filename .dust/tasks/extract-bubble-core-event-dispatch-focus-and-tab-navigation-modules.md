# Extract Bubble Core Event Dispatch, Focus, and Tab Navigation Modules

Move `bubble-core`'s event dispatch, focus transitions, and tab-order traversal into focused internal module(s). Preserve the public runtime API.

## Why This Matters

Event delivery and focus behavior are the most stateful runtime mechanics layered on top of the mutable node store. Extracting them into explicit internal modules makes the event model easier to extend and debug while preserving the current click, submit, focus, blur, and tab-navigation behaviors that the rest of the repo depends on.

## Current Context

- `bubble-core/index.ts` currently stores event listeners, computes propagation paths, dispatches capture and bubble listeners, forwards label activation, manages focus state, and computes tab traversal from one closure.
- Existing tests already cover click propagation, `preventDefault`, `stopPropagation`, listener removal, submit dispatch, focus and blur ordering, focus-change runtime events, repeated-focus no-ops, invalid focus targets, and tab order with supported `tabIndex` overrides.
- The idea's resolved sequencing is to start with runtime mechanics before DOM-semantics-oriented extraction.
- The package should keep a single public `index.ts` entrypoint even after extraction.

## Facts

- [Bubble core builds runtime behaviors as deterministic slices](../facts/bubble-core-builds-runtime-behaviors-as-deterministic-slices.md)
- [Runtime exposes deterministic timers](../facts/runtime-exposes-deterministic-timers.md)
- [Runtime exposes deterministic microtasks](../facts/runtime-exposes-deterministic-microtasks.md)

## Scope

- Extract internal event-runtime module(s) that own listener registration data, propagation-path calculation, and dispatch of bubble events through capture, target, and bubble phases.
- Extract internal focus-navigation module(s) that own active-focus state, blur/focus transitions, runtime focus-change publication, and tab-order computation.
- Keep label forwarding and submit dispatch behavior within this slice so activation and form-submission events remain testable end to end through the public runtime API.
- Leave capability setup, mutable node storage, accessible-name and role derivation, query helpers, and snapshot serialization to other tasks.

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

- `bubble-core/index.ts` delegates event-listener storage, propagation, submit dispatch, focus transitions, and tab-order traversal to focused internal module(s).
- Public dispatch and focus APIs remain unchanged, including click propagation semantics, label activation forwarding, submit result behavior, focus and blur event ordering, and repeated-focus no-ops.
- Existing end-to-end tests stay green for event dispatch, submit handling, focus management, runtime focus-change events, and tab traversal.

## Task Type

implement

## Blocked By

- [Extract Bubble Core Runtime Store and Capability Modules](./extract-bubble-core-runtime-store-and-capability-modules.md)

## Decomposed From

Split Bubble Core Runtime into Focused Modules
