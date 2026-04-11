# Simplify Todo Example for Ergonomics

The todo example should be easier to understand in one pass.
It currently demonstrates several useful `bubbled` boundaries at once, but that makes a very small app feel larger and more indirect than it needs to. The example should become one primary product sample with a shorter "read this first" path, fewer thin wrappers, and a React binding that stays visibly thin.

## Why This Matters

The current example asks a reader to learn app behavior, browser boot, React mounting, store persistence, API wiring, and Bun routes at the same time. That works against Dust principles like context-window efficiency, progressive disclosure, and agent autonomy. A tiny sample should show the minimum practical ceremony first, then reveal extra seams only where they teach something reusable.

## Current Context

The current todo example lives in 16 files under `examples/todo-app/` and is 1,489 lines including tests.

- The runtime path is split across `client.ts`, `main.ts`, `todo-browser.ts`, `todo-react.ts`, `todo-controller.ts`, `todo-store.ts`, `todo-http.ts`, and `server.ts`.
- Several of those files are very small wrappers. `client.ts` is only `await startTodoApp()`. `main.ts` is only `Bun.serve(...)`. `app.ts` is a barrel. `server.ts` mostly republishes constants and handlers from `todo-http.ts`.
- The React path is layered more heavily than the behavior requires. `todo-react.ts` creates the store, creates a controller, owns the render loop, and contains the only component with local state. `todo-controller.ts` mainly wraps store commands and derives a view snapshot.
- The browser startup path is also thinly split. `todo-browser.ts` loads `/api/todos`, creates a bubble, mounts the React app, creates a DOM projector, and renders startup errors. That is the real browser-facing shell for the example.
- Test coverage is broad relative to the feature set. `todo-app.test.tsx` is 466 lines and already exercises most user-visible behavior end to end. Separate suites for `todo-controller.ts`, `todo-http.ts`, and `server.ts` validate many of the same outcomes again at thinner seams.

## Friction Observed

- Understanding "how the app works" requires jumping across browser startup, React mount, controller, store, HTTP helpers, and Bun routes before seeing the full behavior.
- The current file split makes the sample look like this is the default amount of structure needed to use `bubbled`.
- `todo-controller.ts` is not a strong boundary in this example. It adds view-model labels and forwards store methods, but it does not isolate independent business rules.
- `todo-http.ts` and `server.ts` divide a very small server surface across two files without making the example easier to read.
- The example already has one strong pure seam in `todo-store.ts`. That seam is enough to show how app logic can stay outside React without also teaching a controller layer.

## Refined Proposal

Keep one primary simplified todo example and optimize it as a product sample, not a reference architecture.

The target shape should preserve only the seams that pay for themselves in this example:

- Keep a pure todo module for domain logic and derived text.
- Keep the React binding thin and app-specific.
- Keep one browser shell that performs fetch, mount, projection, and startup error handling.
- Keep one Bun server module that serves the page and the `/api/todos` response.

## Recommended Split

The most ergonomic split is a four-layer shape with a deliberately thin React layer:

### 1. Pure todo module

One module should own all pure todo behavior:

- `TodoItem`
- `normalizeTodoLabel()`
- `appendTodo()`
- `toggleTodo()`
- `removeTodo()`
- `summarizeTodos()`
- `createTodoSnapshot(todos)`

This keeps the functional core outside React while removing the separate controller adapter. The current `createTodoAppSnapshot()` logic belongs here because it is pure derivation from todo state, not a React concern.

### 2. Storage-backed app state module

One module should own persistence and subscriptions:

- `createTodoStore({ storage, initialTodos, storageKey })`
- `get()`
- `subscribe()`
- `add()`
- `toggle()`
- `remove()`

This keeps the current useful seam between pure helpers and the imperative storage boundary. It also keeps the example aligned with the repository's preference for thin imperative shells around deterministic logic.

### 3. Thin React binding

The React module should do as little as possible:

- hold draft input state with `useState`
- read todos from the store
- call `createTodoSnapshot(store.get())`
- wire button and input handlers to store commands
- render the JSX view

Concretely, the current split:

- `todo-app.tsx` as presentational JSX
- `todo-react.ts` as mount logic
- `todo-controller.ts` as snapshot and command adapter

can become either:

- `todo-react.tsx`
  Contains the local draft state component, calls `createTodoSnapshot(store.get())`, and exports `mountTodoApp({ bubble, store })`.

or, if keeping a separate JSX file still helps readability:

- `todo-view.tsx`
  Pure presentational component.
- `todo-react.ts`
  Small mount wrapper plus the tiny stateful component that binds `store` to `todo-view.tsx`.

In both cases, React remains a thin binding over a pure todo core and a storage-backed store. The controller layer disappears.

### 4. Single app shell per runtime boundary

The example should keep one browser shell and one server shell:

- `todo-browser.ts`
  Loads initial todos, creates `bubble`, creates the store, mounts the React app, mounts the DOM projector, and handles startup failures.
- `server.ts`
  Exports the route constants, `createTodoRoutes()`, and fallback handling in one place.

`todo-http.ts` should be merged into `server.ts`. `client.ts` and `main.ts` can remain as entrypoint shims because they are runtime-required wrappers, but they should not force additional conceptual layers elsewhere.

## Test Direction

The example should bias toward a smaller number of high-signal tests.

- Keep pure tests around the todo helpers and storage-backed store.
- Keep one end-to-end-ish app suite that verifies the user-visible behavior through the bubble and browser startup path.
- Remove tests whose only purpose is to prove that thin forwarding layers forward correctly.

That likely means the controller suite goes away if the controller goes away, and the server/helper suites should be reconsidered after `todo-http.ts` is merged into `server.ts`.

## Expected Outcome

- A new reader can understand the full app with fewer file jumps.
- The example communicates the minimum practical ceremony for a `bubbled` app.
- React stays visibly thin rather than looking like the home of app logic.
- The example still demonstrates a clean functional-core/imperative-shell split, but only where it materially helps this sample.

## Open Questions

### Should the example keep loading todos through `/api/todos`, or inline the initial data into the HTML bootstrap path?

#### Keep `/api/todos`

Preserve the current end-to-end story where the browser example demonstrates a real fetch before rendering. This keeps the sample honest about network-driven startup, but it also preserves one more moving part in a supposedly minimal example.

#### Inline bootstrap data

Render initial todos directly into the HTML page and let the browser shell mount immediately. This shortens the startup path, but it removes a currently useful demonstration of `bubbled` working with async data loading.

### Should the example keep `createTodoStore({ storage })` explicit in the browser shell, or hide persistence inside a higher-level example helper?

#### Keep the store seam explicit

Show `createTodoStore({ storage: bubble.resolveCapability('storage') })` directly in the example shell. This keeps the example honest about where persistence lives and reinforces the capability model, but it leaves a little more setup code in the sample.

#### Hide persistence inside the mount helper

Let `mountTodoApp()` or a higher-level example helper create the storage-backed store internally. This shortens the example's startup code, but it makes the persistence boundary less visible and risks turning the example into framework magic.
