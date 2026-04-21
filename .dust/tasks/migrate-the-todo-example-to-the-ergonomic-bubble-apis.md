# Migrate the Todo Example to the Ergonomic Bubble APIs

Migrate `examples/todo-app` to the new ergonomic APIs so the example demonstrates the bubble model without the current wiring overhead.

After the shared bootstrap, binding helpers, test helpers, and expanded `bubble-react` surface exist, rewrite the todo example to use them end to end. Replace the bespoke browser-host assembly in [examples/todo-app/browser/client.ts](../../examples/todo-app/browser/client.ts), simplify [examples/todo-app/react/mountTodoApp.ts](../../examples/todo-app/react/mountTodoApp.ts), and update startup flow in [examples/todo-app/app/start-todo-app.ts](../../examples/todo-app/app/start-todo-app.ts) so network and other runtime-facing I/O go through explicit bubble-owned seams instead of a custom example-only host protocol. Update the tests and README examples so the repository’s flagship example shows the ergonomic path, not just the low-level primitives.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

- [Add Semantic Typing and Submit Helpers to Bubble Test](./add-semantic-typing-and-submit-helpers-to-bubble-test.md)
- [Expand Bubble React's Deterministic Authoring Surface](./expand-bubble-reacts-deterministic-authoring-surface.md)

## Definition of Done

- The todo example uses the shared ergonomic APIs instead of bespoke bootstrap and event-shaping code.
- The example’s startup path routes runtime-facing I/O through explicit bubble-owned seams that can be exercised without real browser or HTTP hosting.
- Todo example tests use the higher-level `bubble-test` helpers rather than low-level manual event dispatch where the new helpers apply.
- README or example documentation reflects the new ergonomic path so the example reinforces the framework’s intended authoring model.
