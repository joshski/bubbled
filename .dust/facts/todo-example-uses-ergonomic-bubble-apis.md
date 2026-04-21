# Todo example uses ergonomic bubble APIs

The `examples/todo-app` demonstrates the ergonomic bubble authoring model end to end.

## Startup path

`start-todo-app.ts` accepts a `BubbleRuntime` and a thin `TodoStartHost` interface. Network I/O uses `bubble.fetch()` via the injected `network` capability — no bespoke host protocol. The host interface is limited to DOM-only seams: `getAppContainer`, `mountApp`, `onBeforeUnload`, `createErrorMessage`, `logError`.

In tests, the network capability is replaced with a fake (`createBubble({ capabilities: { network: ... } })`), making startup behaviour fully exercisable without a real browser or HTTP server.

## React mount

`mountTodoApp` in `react/mountTodoApp.ts` creates a `BubbleReactRoot`, subscribes to the store, and renders the `TodoAppView`. It accepts an optional pre-created `BubbleRuntime` so callers (including `startTodoApp`) can share the same bubble instance across network, storage, and render concerns.

## Browser client

`browser/client.ts` creates a `BubbleRuntime` with a real `network` capability (bridging `globalThis.fetch` to `BubbleNetworkRequest`/`BubbleNetworkResponse`), then passes it to `startTodoApp` with a thin DOM host. DOM projection is handled in `host.mountApp` via `mountBubbleApp` from `bubble-browser`.

## Tests

`mountTodoApp.test.ts` uses `createSemanticAssertions`, `createSemanticInteractions`, and `createSemanticQueries` from `bubble-test` for all interactions and assertions. Low-level `dispatchEvent` is retained only for edge-case coverage (missing change payload) where semantic helpers are not applicable.
