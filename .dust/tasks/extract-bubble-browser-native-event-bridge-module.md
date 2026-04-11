# Extract Bubble Browser Native Event Bridge Module

Move `bubble-browser`'s native DOM event translation into focused internal bridge module(s). Preserve `createDomProjector({ bridgeEvents: true })` as the public behavior switch.

## Why This Matters

`createDomProjector()` currently interleaves DOM tree projection with `click`, `input`, and `submit` bridge registration and translation. Pulling the bridge logic behind a dedicated boundary makes event behavior easier to test and change without reopening generic DOM mutation code.

## Current Context

- `bubble-browser/index.ts` currently registers DOM listeners for `click`, `input`, and `submit` directly inside projector mount logic.
- The event bridge logic reads the runtime node, translates native form-state changes into bubble event data, dispatches bubble events, and selectively prevents native submit behavior.
- Existing tests already cover bridged clicks, mapped bubble targets, repeated projections, bridged text input values, bridged checkbox state, ignored null or unknown targets, and bridged form submission.
- Real browser verification already checks bridged default-submit-button behavior end-to-end.

## Facts

- [Bubble browser mounts snapshots into DOM containers](../facts/bubble-browser-mounts-snapshots-into-dom-containers.md)
- [Bubble browser bridges DOM clicks into bubble events](../facts/bubble-browser-bridges-dom-clicks-into-bubble-events.md)
- [Bubble browser bridges DOM submits into bubble events](../facts/bubble-browser-bridges-dom-submits-into-bubble-events.md)

## Scope

- Extract internal bridge module(s) that register and unregister the native DOM listeners used when `bridgeEvents` is enabled.
- Move DOM-to-bubble translation for `click`, `input`, and `submit` into those bridge module(s), including form-state extraction and safe handling of null, unknown, or stale targets.
- Keep `createDomProjector()` as the public composition point and preserve current mount, unmount, projection, and event-bridge behavior.
- Preserve existing end-to-end submit behavior where bridged submit events prevent native form submission after dispatching the bubble event.
- Leave focus synchronization extraction to a later task.

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

- `bubble-browser/index.ts` delegates native event registration and translation to focused internal bridge module(s).
- `createDomProjector({ bridgeEvents: true })` preserves current click, input, and submit behavior, including mapped targets, form-state payloads, ignored invalid targets, and prevented native submit behavior.
- Existing unit and real-browser tests stay green for bridged DOM events.

## Task Type

implement

## Blocked By

- [Extract Bubble Browser Projection State and Layout Modules](./extract-bubble-browser-projection-state-and-layout-modules.md)

## Decomposed From

Split Bubble Browser Projector, Layout, and Event Bridges
