# Simplify Todo Example for Ergonomics

The todo example should be easier to understand in one pass.
It currently demonstrates several useful `bubbled` boundaries at once, but that makes a very small app feel larger and more indirect than it needs to. The example should have a simpler "read this first" path that reduces file count, collapses thin adapter layers, and trims duplicated tests while still preserving one place where the full end-to-end integration remains visible.

## Why This Matters

The current structure makes a beginner pay the cost of understanding framework architecture before they can understand the app itself. That works against Dust principles like context-window efficiency, progressive disclosure, and agent autonomy: a tiny example should be easy to load into context and easy to change without first reconstructing how browser startup, React rendering, controller snapshots, store persistence, HTTP helpers, and Bun routes all fit together.

## Current Context

The todo example is spread across many files for a small amount of behavior:

- Runtime entrypoints are split across `examples/todo-app/client.ts`, `examples/todo-app/main.ts`, `examples/todo-app/todo-browser.ts`, `examples/todo-app/todo-react.ts`, `examples/todo-app/todo-controller.ts`, `examples/todo-app/todo-store.ts`, `examples/todo-app/todo-http.ts`, and `examples/todo-app/server.ts`.
- Several of those files are very thin adapters. `client.ts` is only a call to `startTodoApp()`, `main.ts` only wires Bun routes, `app.ts` is only a barrel, and `todo-http.ts` / `server.ts` split a very small routing surface across two files.
- The React path is also layered more heavily than the behavior requires. `todo-app.tsx` is a presentational view, `todo-react.ts` owns state and rendering, and `todo-controller.ts` mostly forwards store operations after deriving labels and summary text.
- The example test surface is large relative to the feature set. The example has roughly 1,500 lines across app and tests, with large dedicated suites for the store, controller, browser mount path, HTTP helpers, and Bun server routes. Some behavior is validated at multiple layers.

## Friction Observed

- Understanding "how the app works" requires hopping between multiple files before reaching the core todo behavior.
- The example teaches framework seams before it teaches the product behavior of "load todos, add one, toggle one, remove one."
- Thin wrapper files increase search cost without adding much domain logic.
- The current structure makes the example look like the default amount of ceremony required to use `bubbled`, even if some of those seams mainly exist to keep library layers explicit and testable.

## Idea

Create a more ergonomic todo example by defining one primary minimal path and moving optional structure behind that path.

Possible shape:

- Collapse thin app-specific layers so the main example is easier to read in one pass.
- Keep pure todo state helpers, but consider merging controller-style snapshot derivation into either the store module or the React mount module if it is only used by this example.
- Merge `todo-http.ts` and `server.ts`, or otherwise reduce server-side file count for the example.
- Remove or avoid barrels like `examples/todo-app/app.ts` when they do not make the example easier to follow.
- Rebalance tests toward a smaller number of high-signal tests that cover user-visible behavior, instead of separately testing every thin adapter.
- If the project still wants to showcase the more layered architecture, keep that as a secondary "decomposed" example or documentation section rather than the default todo walkthrough.

## Expected Outcome

- A new reader can understand the whole example with far fewer file jumps.
- Agents can modify the example inside a smaller context window.
- The example better communicates the minimum practical ceremony for a `bubbled` app.
- More advanced layering stays available where it teaches something genuinely reusable, rather than being mandatory everywhere.

## Open Questions

### Should the repository keep one todo example or split it into "minimal" and "layered" variants?

#### One primary simplified example

Use a single todo example and optimize it for readability. This makes the default learning path shorter, but it gives up the current example as a showcase for explicit architectural seams.

#### Two variants with different teaching goals

Keep a minimal example for first contact and add a separate layered example for architecture and testing patterns. This preserves both teaching modes, but it adds maintenance cost and risks duplication.

### How much of the current separation is intended as library guidance rather than app-specific complexity?

#### Treat the example as a product sample

Collapse any layer that exists only for this app, even if a real library consumer might decompose it later. This keeps the example honest about minimum setup.

#### Treat the example as a reference architecture

Keep explicit store/controller/view boundaries if they are meant to model recommended `bubbled` usage. This preserves guidance, but likely requires clearer documentation about why the extra files exist.
