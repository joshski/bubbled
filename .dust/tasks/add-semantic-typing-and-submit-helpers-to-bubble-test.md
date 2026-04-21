# Add Semantic Typing and Submit Helpers to Bubble Test

Add semantic typing and submit helpers to `bubble-test` so app tests can describe user flows instead of dispatching raw events.

The todo example currently reaches into `bubble.dispatchEvent()` and hand-assembles change payloads in [examples/todo-app/react/mountTodoApp.test.ts](../../examples/todo-app/react/mountTodoApp.test.ts). Extend [bubble-test/index.ts](../../bubble-test/index.ts), [bubble-test/render-harness.ts](../../bubble-test/render-harness.ts), and the interaction/query helpers so tests can type into fields and submit forms by role or other semantic queries. Keep the helpers thin wrappers over explicit bubble semantics rather than DOM emulation, and align their behavior with the canonical payload rules established in `bubble-react`.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

(none)

## Definition of Done

- `bubble-test` exposes higher-level helpers for typing text and submitting forms without requiring tests to call `bubble.dispatchEvent()` directly.
- The helper behavior is defined in terms of bubble semantics rather than fake DOM implementation details.
- Tests cover successful interaction paths and error reporting when semantic targets cannot be found.
- The todo example tests can migrate to the new helpers with less bespoke harness code.
