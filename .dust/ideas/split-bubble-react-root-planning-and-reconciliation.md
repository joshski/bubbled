# Split Bubble React Root Planning and Reconciliation

`bubble-react/index.ts` is currently 777 lines. It combines a minimal React planner, a hook dispatcher shim, and a full reconciliation layer that mutates `bubble-core`. The package is still conceptually small, but its current implementation packs several distinct phases into one file.

## Why This Matters

This package is the bridge between React nodes and bubble mutations. Changes here are likely to be frequent while the React slice expands beyond the current host-elements-and-`useState` support, so keeping planning, hook state, and reconciliation in one file raises the cost of each extension.

## Current Context

- The file defines both the public root API and all internal plan/node types.
- `planReactProps()`, `planFunctionComponent()`, and `planReactNode()` convert React input into an internal plan tree.
- The hook shim is embedded inside `planFunctionComponent()` and is tightly coupled to component-path state tracking and render scheduling.
- `reconcileAttributes()`, `reconcileProperties()`, `reconcileEventHandlers()`, `createNode()`, `reconcileNode()`, and `reconcileChildren()` implement the mutation layer against `BubbleTransaction`.
- `createBubbleReactRoot()` then adds render scheduling and component state lifetime management on top of both phases.

## Friction Observed

- Planning and reconciliation are different conceptual stages, but they are not separated by module boundaries.
- Hook support is currently tiny, yet it is mixed directly into tree planning, which will get harder to evolve if more hooks or component features are added.
- The keyed and unkeyed child reconciliation paths are dense enough that they deserve a more focused module than the package entrypoint.
- The current file makes it hard to answer whether a change belongs to React input normalization, component execution, or bubble mutation logic.

## Idea

Split the package into smaller internal modules that reflect the render pipeline.

Possible shape:

- Keep public root creation in `index.ts` or a small root module.
- Move plan data structures and prop normalization into planning-oriented modules.
- Isolate function component execution and hook dispatcher management so unsupported-hook policy is not embedded in the same file as DOM reconciliation.
- Move node creation and child reconciliation into a reconciler module that owns `BubbleTransaction` writes.
- Keep render scheduling and component state retention in a root/runtime module that composes the planner and reconciler.

## Expected Outcome

- React feature work can target the planner, hook runtime, or reconciler independently.
- The current keyed-child diff logic becomes easier to review and test in isolation.
- The root entrypoint becomes small enough to communicate the package architecture in one pass.
- Future support for additional hooks or node types has clearer boundaries.

## Open Questions

### Should unsupported React features stay enforced inside the planner, or move into a separate hook/runtime boundary?

#### Keep feature enforcement in the planner

Continue rejecting unsupported nodes and hooks during planning. This keeps the render pipeline simple, but it preserves some coupling between React execution and plan generation.

#### Introduce a separate component runtime layer

Move hook dispatch and unsupported-feature checks into a distinct module that runs components before planning host output. This creates a clearer architecture if the supported React surface grows.

### Should the first split prioritize child reconciliation or component execution?

#### Extract child reconciliation first

The keyed and unkeyed diff paths are the densest logic in the file and can be isolated without changing how planning works.

#### Extract component execution first

The hook shim and component-path state model are the package's most specialized behavior and may deserve a dedicated boundary before the reconciler grows further.
