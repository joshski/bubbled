# Expand Bubble React's Deterministic Authoring Surface

Expand `bubble-react` to support a slightly broader React authoring surface without introducing ambient effect semantics.

Right now [bubble-react/component-execution.ts](../../bubble-react/component-execution.ts) and [bubble-react/planner.ts](../../bubble-react/planner.ts) deliberately fail on fragments and most hooks, which keeps the slice safe but creates a steep ergonomics cliff for real app code. Add a selective set of deterministic features such as fragments and stateful hooks like `useReducer` and `useRef`, while continuing to reject `useEffect`-style ambient side effects explicitly. Preserve the current fail-loudly behavior for unsupported React features and keep the supported surface documented by tests rather than implicit behavior.

## Task Type

implement

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Blocked By

(none)

## Definition of Done

- `bubble-react` supports an expanded but explicitly bounded subset of React authoring features that improves ergonomics for app code.
- Unsupported features that would reintroduce ambient runtime behavior still fail with explicit errors.
- Tests in `bubble-react/index.test.tsx` document the new supported surface and guard existing deterministic behavior.
- The supported feature set is sufficient to simplify example app code without weakening bubble ownership of state and events.
