# Extract Bubble React Child Reconciliation Module

Move bubble-react's child reconciliation logic into focused internal module(s) while preserving the current root API and end-to-end behavior.

## Why This Matters

`reconcileChildren()` and the helpers it depends on are the densest logic in `bubble-react/index.ts`. Keyed reorders, mixed keyed and unkeyed children, subtree event-handler cleanup, and node reuse all live in one place today. Extracting that slice first reduces the size and coupling of the entrypoint without changing how `createBubbleReactRoot()` renders into `bubble-core`.

## Current Context

- `bubble-react/index.ts` currently owns both planning and reconciliation.
- The resolved direction for this idea is to extract child reconciliation before component execution.
- Existing tests already cover keyed reorders, keyed removals, mixed keyed and unkeyed children, nested unkeyed replacement, and event handler replacement/removal through the public root API.

## Facts

- [Bubble React renders simple host trees into the bubble](../facts/bubble-react-renders-simple-host-trees-into-the-bubble.md)
- [Bubble core builds runtime behaviors as deterministic slices](../facts/bubble-core-builds-runtime-behaviors-as-deterministic-slices.md)

## Scope

- Extract the child reconciliation layer behind internal module boundaries under `bubble-react/`.
- Move the node creation, node reuse, attribute/property reconciliation, event listener reconciliation, subtree event-listener cleanup, and child list diff logic out of `bubble-react/index.ts`.
- Keep `createBubbleReactRoot({ bubble })` as the public entrypoint and keep reconciliation exercised through end-to-end root renders rather than through a new public API.
- Preserve the current keyed and unkeyed reconciliation semantics, including move-vs-replace behavior and listener cleanup for removed nodes.

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

- `bubble-react/index.ts` delegates child reconciliation to internal module(s) instead of owning the full diff implementation directly.
- The extracted module boundary still drives mutations through `BubbleTransaction` and preserves current keyed reorder, keyed removal, mixed keyed/unkeyed, and unkeyed replacement/removal behavior end to end.
- Existing reconciliation coverage in `bubble-react/index.test.tsx` stays green, with added or adjusted tests only where the extraction needs stronger behavioral protection.
- The public `createBubbleReactRoot()` API and observable bubble mutations remain unchanged.

## Task Type

implement

## Blocked By

(none)

## Decomposed From

Split Bubble React Root Planning and Reconciliation
