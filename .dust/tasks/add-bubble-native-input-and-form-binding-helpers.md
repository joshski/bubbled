# Add Bubble-Native Input and Form Binding Helpers

Add bubble-native input and form binding helpers that remove low-level change-event ceremony from React app code.

`valueChangeHandler()` in [bubble-react/react-dom-bindings.ts](../../bubble-react/react-dom-bindings.ts) proves the event model works, but authoring still feels adapter-shaped in [examples/todo-app/react/mountTodoApp.ts](../../examples/todo-app/react/mountTodoApp.ts) and [examples/todo-app/react/TodoAppView.tsx](../../examples/todo-app/react/TodoAppView.tsx). Introduce higher-level bindings for controlled text inputs and form submission that preserve explicit bubble events while letting component code read more like normal UI code. Define the canonical change and submit payload semantics in one place so tests and apps stop hand-shaping them.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

(none)

## Definition of Done

- `bubble-react` exposes higher-level input and form helpers that replace direct use of `valueChangeHandler()` for common controlled-input cases.
- The helpers define deterministic payload semantics for missing, null, and non-string input values.
- Tests in `bubble-react` cover the new helpers and preserve explicit failure behavior for unsupported patterns.
- The new API is suitable for the todo example to adopt without custom event-shaping code in the example itself.
