# Create Shared Browser Bootstrap for Bubble Apps

Create a shared browser bootstrap that assembles bubble creation, React mounting, DOM projection, and teardown behind one API.

Today the todo example composes `createBubble()`, `mountTodoApp()`, `createDomProjector()`, container replacement, and `beforeunload` cleanup directly in [examples/todo-app/browser/client.ts](../../examples/todo-app/browser/client.ts). Add a reusable bootstrap in the runtime layer so browser-backed examples do not need to rebuild that wiring by hand. Keep the bubble runtime as the canonical source of truth, keep capability injection explicit, and keep DOM event bridging and focus sync configurable rather than ambient. The resulting API should be usable by `examples/todo-app` without forcing that example to invent its own browser host assembly code.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

(none)

## Definition of Done

- A shared bootstrap API exists in the runtime packages for mounting a bubble-backed app into a browser container with explicit teardown.
- The bootstrap API accepts explicit capability and projector configuration instead of hard-coding DOM behavior.
- Tests cover successful mount, cleanup, and configuration of bridged DOM behavior without depending on the todo example.
- The todo example can be migrated to the new bootstrap without needing new browser-only seams.
