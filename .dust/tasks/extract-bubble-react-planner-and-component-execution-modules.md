# Extract Bubble React Planner and Component Execution Modules

Move bubble-react's plan generation and function-component execution into focused internal module(s). Keep unsupported React feature enforcement inside the planner and leave the entrypoint as a small composition layer.

## Why This Matters

The remaining coupling in `bubble-react/index.ts` is between React input normalization, function-component execution, hook dispatch, component-state lookup, and render scheduling. Separating planning from the root orchestration clarifies where new React support belongs without changing the current observable slice of host elements plus `useState`.

## Current Context

- The idea's resolved direction is to keep unsupported-feature enforcement in the planner.
- `planReactProps()`, `planFunctionComponent()`, and `planReactNode()` currently mix plan construction with hook-dispatcher setup and unsupported-hook enforcement.
- `createBubbleReactRoot()` also owns component-state lifetime, re-render scheduling, and composition of planning with reconciliation.
- Existing tests cover plain host planning, `useState`, lazy initializers, deterministic repeated updates, render-phase updates, re-entrant renders, unsupported hooks, unsupported nodes, and async function component rejection.

## Facts

- [Bubble React renders simple host trees into the bubble](../facts/bubble-react-renders-simple-host-trees-into-the-bubble.md)
- [Bubble core builds runtime behaviors as deterministic slices](../facts/bubble-core-builds-runtime-behaviors-as-deterministic-slices.md)
- [Runtime exposes deterministic microtasks](../facts/runtime-exposes-deterministic-microtasks.md)

## Scope

- Extract plan types, prop normalization, function-component execution, and planner entrypoints into internal module(s) under `bubble-react/`.
- Keep unsupported node and unsupported hook checks inside the planner boundary rather than introducing a separate runtime policy layer.
- Leave `createBubbleReactRoot()` responsible for current-node storage, component-state retention by path, render scheduling, and composition of planner plus reconciler.
- Preserve the current `useState` semantics and error behavior for unsupported React features.

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

- `bubble-react/index.ts` becomes a small root-composition module that delegates planning to internal planner/component modules and reconciliation to the extracted reconciler boundary.
- Unsupported React nodes, unsupported hooks, and async function components still fail from the planner path without mutating the bubble.
- Existing `useState` behaviors remain intact, including lazy initialization, deterministic repeated updates, ignored no-op updates, render-phase updates, and re-entrant renders.
- `bubble-react/index.test.tsx` continues to verify the public root API end to end, with added or adjusted tests only where the planner extraction needs stronger behavioral coverage.

## Task Type

implement

## Blocked By

(none)

## Decomposed From

Split Bubble React Root Planning and Reconciliation
