# Split Bubble Core Runtime into Focused Modules

`bubble-core/index.ts` is currently 1,760 lines and carries nearly the entire runtime in one file. That makes the package hard to load into context, especially because the file mixes public types, snapshot/query helpers, DOM-adjacent metadata derivation, event dispatch, focus management, form serialization, capability setup, and transactional mutation logic.

## Why This Matters

The current shape works against Dust principles like small units, decoupled code, and context-optimised code. `bubble-core` is the most central package in the repository, so every feature that touches runtime state, event propagation, focus, forms, or serialization starts by loading a very large file with many unrelated responsibilities.

## Current Context

- `createBubbleQuery()` and `serializeBubbleSnapshot()` sit near the top of the file and operate on snapshots rather than on the mutable runtime.
- The middle of the file is dominated by runtime-specific validation and derived metadata helpers such as input coercion, tabbability checks, accessible name/role derivation, label resolution, and form entry extraction.
- `createBubble()` owns capability defaults, node cloning/snapshotting, event listener storage, event path calculation, event dispatch, tab order, form serialization, metadata refresh, and the full transaction API.
- A single change to eventing or focus currently shares a file with snapshot serialization and storage capability setup, even though those concerns are only loosely related.

## Friction Observed

- It is difficult to reason about the transaction engine without also scanning serialization, query helpers, and capability defaults.
- Event dispatch and focus behavior are intertwined with unrelated helpers, which raises the cost of safely extending the event model.
- Accessible name, implicit role, label forwarding, and form serialization logic all exist, but their boundaries are implicit rather than module-enforced.
- The public type surface and the runtime implementation live together, so even API-only edits require opening the largest file in the codebase.

## Idea

Decompose `bubble-core/index.ts` into smaller internal modules with the entrypoint re-exporting the public API.

Possible extraction seams:

- Move public runtime types and interfaces into one or more API-focused modules.
- Move snapshot/query helpers into a snapshot module, since they operate on readonly state rather than live transactions.
- Move accessible metadata and form helpers into DOM-semantics-oriented modules that own roles, names, label association, tabbability, and form serialization rules.
- Move event listener storage and dispatch path logic into an events module.
- Move the mutable node store and transaction implementation into runtime/store modules that own cloning, mutation application, and commit records.
- Keep `createBubble()` as a thin composition layer that wires capabilities and delegates behavior to these smaller modules.

## Expected Outcome

- Runtime changes can be made with smaller working context.
- Eventing, form behavior, and accessibility semantics become easier to test and evolve independently.
- The package entrypoint can stay stable while internal responsibilities become explicit.
- Future runtime features have clearer landing zones instead of extending a single monolithic file.

## Open Questions

### Should `bubble-core` continue to expose a single `index.ts` implementation file with internal helpers hidden inside it, or should the package gain explicit internal modules?

#### Keep a single public entrypoint with internal files only

Split the implementation under `bubble-core/` but preserve `index.ts` as the only public import surface. This keeps package ergonomics unchanged while still reducing implementation sprawl.

#### Expose subpath entrypoints for major capabilities

Create public subpath modules such as snapshot or query helpers in addition to the main entrypoint. This could improve discoverability, but it would expand the supported API surface and create compatibility commitments.

### Should the first decomposition center on runtime mechanics or on DOM semantics?

#### Start with runtime mechanics

Extract transactions, node storage, and event dispatch first. This attacks the largest concentration of stateful complexity and leaves higher-level semantics on top of a clearer runtime core.

#### Start with DOM semantics

Extract roles, names, tabbability, label forwarding, and form serialization first. This isolates the browser-like rules that are currently spread through the file and may make the remaining runtime easier to understand.
