# Extract Bubble Browser Focus Sync Module

Move `bubble-browser`'s focus synchronization into focused internal module(s). Preserve `createDomProjector({ syncFocus: true })` as the public behavior switch.

## Why This Matters

Focus synchronization is its own feedback-controlled state machine inside `createDomProjector()`. Extracting it into a dedicated module makes the bubble-to-DOM and DOM-to-bubble focus rules explicit, reduces the risk of regressions when projector code changes, and gives browser-boundary focus bugs a smaller surface to debug.

## Current Context

- `bubble-browser/index.ts` currently owns DOM projection, runtime subscription, native event bridging, and focus synchronization in one closure.
- The focus-sync logic guards against projector-driven feedback loops while reconciling runtime focus state with `ownerDocument.activeElement`.
- Existing tests already cover syncing bubble focus into the DOM, clearing focus, DOM-originated focus changes, ignored unknown targets, and safe behavior across mount and unmount cycles.
- Real browser verification covers native label focus transfer with `createDomProjector({ syncFocus: true })`.

## Facts

- [Bubble browser mounts snapshots into DOM containers](../facts/bubble-browser-mounts-snapshots-into-dom-containers.md)
- [Bubble browser syncs focus between bubble and projected DOM](../facts/bubble-browser-syncs-focus-between-bubble-and-projected-dom.md)
- [Bubble browser verifies native label focus in a real browser](../facts/bubble-browser-verifies-native-label-focus-in-a-real-browser.md)

## Scope

- Extract internal focus-sync module(s) that own DOM-to-bubble and bubble-to-DOM focus reconciliation, including any feedback-loop guards required by the current behavior.
- Keep `createDomProjector()` as the public composition point and preserve current mount, unmount, projection, and focus-sync behavior.
- Preserve the existing behavior where focus sync depends on the projected DOM lookup and document active element state rather than introducing a new public API.
- Leave native event bridge extraction outside this task.

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

- `bubble-browser/index.ts` delegates focus synchronization to focused internal module(s).
- `createDomProjector({ syncFocus: true })` preserves current bubble-to-DOM and DOM-to-bubble focus behavior, including loop guards and safe handling of unknown or detached targets.
- Existing unit and real-browser focus tests stay green.

## Task Type

implement

## Blocked By

- [Extract Bubble Browser Projection State and Layout Modules](./extract-bubble-browser-projection-state-and-layout-modules.md)

## Decomposed From

Split Bubble Browser Projector, Layout, and Event Bridges
